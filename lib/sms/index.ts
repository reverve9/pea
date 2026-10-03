import 'server-only'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { SCHEDULE_TYPE, formatPeriod } from '@/lib/display'
import type { ScheduleType } from '@/lib/types'
import { readSmsConfig } from './config'
import { createDispatcher, type DispatchResult } from './dispatcher'
import { createSolapiProvider } from './solapi'
import { createSupabaseSmsStore } from './store'
import {
  autoCancelledMessage,
  depositAdditionalMessage,
  depositInitialMessage,
  refundCompletedMessage,
  refundReceivedMessage,
  type SmsAppInfo,
} from './templates'

// 업무 처리(입금확인·환불) 저장 성공 후 호출하는 문자 안내 진입점.
// ⚠ 반드시 저장 성공 뒤에만 호출. 모든 함수는 예외를 던지지 않는다(문자 실패가 업무 결과를 되돌리지 않음).
// 수신번호·금액·신청 내역은 호출 시점에 DB 에 저장된 신청 정보를 다시 읽어 만든다.

export function smsDispatcher() {
  const config = readSmsConfig()
  const provider = config.apiKey && config.apiSecret ? createSolapiProvider({ apiKey: config.apiKey, apiSecret: config.apiSecret }) : null
  return createDispatcher({ store: createSupabaseSmsStore(supabaseAdmin), config, provider })
}

function myUrl(): string | null {
  const base = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')
  return base ? `${base}/my` : null
}

interface AppRow {
  id: string
  application_no: string
  applicant_name: string
  phone: string
  total_amount: number
  refunded_amount: number
  is_waitlisted: boolean | null
  session: {
    label: string
    schedule_type: ScheduleType
    starts_on: string
    ends_on: string
    nights: number
    course: { sport: string | null } | { sport: string | null }[] | null
  } | null
}

async function loadApp(appId: string): Promise<{ row: AppRow; info: SmsAppInfo } | null> {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(
      'id, application_no, applicant_name, phone, total_amount, refunded_amount, is_waitlisted, ' +
        'session:sessions(label, schedule_type, starts_on, ends_on, nights, course:courses(sport))',
    )
    .eq('id', appId)
    .maybeSingle()
  if (error || !data) return null
  const row = data as unknown as AppRow
  const sRaw = row.session as AppRow['session'] | NonNullable<AppRow['session']>[]
  const s = Array.isArray(sRaw) ? sRaw[0] ?? null : sRaw
  const course = s ? (Array.isArray(s.course) ? s.course[0] : s.course) : null
  const st = s?.schedule_type ?? 'jikmu'
  const track = st === 'jikmu' ? '직무연수' : `자율패키지 · ${SCHEDULE_TYPE[st]?.label ?? ''}`
  const programLabel = [course?.sport, track].filter(Boolean).join(' ') + (s?.label ? ` · ${s.label}` : '')
  return {
    row,
    info: {
      applicationNo: row.application_no,
      applicantName: row.applicant_name,
      programLabel,
      period: s ? formatPeriod(s.starts_on, s.ends_on, s.nights) : '',
      isWaitlisted: !!row.is_waitlisted,
    },
  }
}

function report(tag: string, ref: string, r: DispatchResult) {
  if (r.outcome === 'sent' || r.outcome === 'duplicate' || r.outcome === 'held') return
  // 수신번호·문안·키는 남기지 않는다.
  console.error(`[sms] ${tag} ${ref}: ${r.outcome}${'error' in r ? ` ${r.error}` : 'detail' in r && r.detail ? ` ${r.detail}` : ''}`)
}

async function safe(tag: string, ref: string, fn: () => Promise<DispatchResult | null>) {
  try {
    const r = await fn()
    if (r) report(tag, ref, r)
  } catch (e) {
    console.error(`[sms] ${tag} ${ref}: exception`, e instanceof Error ? e.message : '')
  }
}

// 최초 입금확인 — 신청당 1회(되돌림 후 재확인해도 재발송하지 않음).
export async function notifyDepositInitial(appId: string): Promise<void> {
  await safe('deposit_initial', appId, async () => {
    const a = await loadApp(appId)
    if (!a) return null
    const amount = (a.row.total_amount ?? 0) - (a.row.refunded_amount ?? 0)
    return smsDispatcher().dispatch({
      kind: 'deposit_initial',
      dedupeKey: `deposit_initial:${appId}`,
      applicationId: appId,
      refundRequestId: null,
      recipient: a.row.phone,
      message: depositInitialMessage({ app: a.info, amount, myUrl: myUrl() }),
    })
  })
}

// 추가입금 확인 — 추가입금 주기(확인 후 총액·확인액) 단위 1회. 같은 주기의 되돌림·재확인은 재발송하지 않음.
export async function notifyDepositAdditional(appId: string, amount: number): Promise<void> {
  await safe('deposit_additional', appId, async () => {
    const a = await loadApp(appId)
    if (!a) return null
    return smsDispatcher().dispatch({
      kind: 'deposit_additional',
      dedupeKey: `deposit_additional:${appId}:${a.row.total_amount}:${amount}`,
      applicationId: appId,
      refundRequestId: null,
      recipient: a.row.phone,
      message: depositAdditionalMessage({ app: a.info, amount, total: a.row.total_amount, myUrl: myUrl() }),
    })
  })
}

interface RefundRow {
  id: string
  application_id: string | null
  origin: 'user' | 'modification' | 'admin'
  amount: number | null
  created_at: string
}

async function loadRefund(refundId: string): Promise<RefundRow | null> {
  const { data, error } = await supabaseAdmin
    .from('refund_requests')
    .select('id, application_id, origin, amount, created_at')
    .eq('id', refundId)
    .maybeSingle()
  if (error || !data) return null
  return data as RefundRow
}

// 환불접수 — 환불 요청 건당 1회(접수 경로 무관). 관리자 직접 환불(접수 즉시 완료)은 완료 문자만 보낸다.
export async function notifyRefundReceived(refundId: string): Promise<void> {
  await safe('refund_received', refundId, async () => {
    const r = await loadRefund(refundId)
    if (!r || !r.application_id || r.origin === 'admin') return null
    const a = await loadApp(r.application_id)
    if (!a) return null
    return smsDispatcher().dispatch({
      kind: 'refund_received',
      dedupeKey: `refund_received:${refundId}`,
      applicationId: r.application_id,
      refundRequestId: refundId,
      recipient: a.row.phone,
      message: refundReceivedMessage({
        app: a.info,
        origin: r.origin,
        requestedAmount: r.amount,
        receivedAt: r.created_at,
        myUrl: myUrl(),
      }),
    })
  })
}

// 환불완료 — 환불 건당 1회. amount = 이번 확정(송금 완료 처리) 금액, full = 전액(신청 환불완료 전환) 여부.
export async function notifyRefundCompleted(refundId: string, amount: number, full: boolean): Promise<void> {
  await safe('refund_completed', refundId, async () => {
    const r = await loadRefund(refundId)
    if (!r || !r.application_id) return null
    const a = await loadApp(r.application_id)
    if (!a) return null
    return smsDispatcher().dispatch({
      kind: 'refund_completed',
      dedupeKey: `refund_completed:${refundId}`,
      applicationId: r.application_id,
      refundRequestId: refundId,
      recipient: a.row.phone,
      message: refundCompletedMessage({
        app: a.info,
        amount,
        full,
        completedAt: new Date().toISOString(),
        receivedAt: r.origin === 'admin' ? null : r.created_at,
        myUrl: myUrl(),
      }),
    })
  })
}

// 입금기한 경과 자동취소 — 신청당 1회(관리자 복구 후에도 재발송하지 않음). deadline = 적용된 입금기한(ISO).
export async function notifyAutoCancelled(appId: string, deadline: string): Promise<void> {
  await safe('auto_cancelled', appId, async () => {
    const a = await loadApp(appId)
    if (!a) return null
    return smsDispatcher().dispatch({
      kind: 'auto_cancelled',
      dedupeKey: `auto_cancelled:${appId}`,
      applicationId: appId,
      refundRequestId: null,
      recipient: a.row.phone,
      message: autoCancelledMessage({ app: a.info, deadline, myUrl: myUrl() }),
    })
  })
}
