import 'server-only'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PLACEHOLDER_ORG } from '@/lib/siteMeta'
import { depositDeadline, dueDeadline } from '@/lib/depositDeadline'
import { loadLedger } from '@/lib/refundLedger'
import { readSmsConfig } from './config'
import { createDispatcher, type DispatchResult } from './dispatcher'
import { createSolapiProvider } from './solapi'
import { createSupabaseSmsStore } from './store'
import { SMS_SITE_HOST, fmtAccount, fmtAmount, fmtSchedule, kstDate, renderSms, type SmsVars } from './templates'
import type { SmsKind } from './types'

// 업무 처리(접수·입금확인·환불) 저장 성공 후, 또는 오전 10시 일괄 안내(lib/dailyNotices)에서 호출하는 알림톡 안내 진입점.
// ⚠ 반드시 저장 성공 뒤에만 호출. 모든 함수는 예외를 던지지 않는다(알림톡 실패가 업무 결과를 되돌리지 않음).
// 변수 값은 호출 시점에 DB 에 저장된 신청·입금·환불 정보를 다시 읽어 만든다. 비는 값은 추정하지 않고 보류한다.

export function smsDispatcher() {
  const config = readSmsConfig()
  const provider = config.apiKey && config.apiSecret ? createSolapiProvider({ apiKey: config.apiKey, apiSecret: config.apiSecret }) : null
  return createDispatcher({ store: createSupabaseSmsStore(supabaseAdmin), config, provider })
}

// 공지 링크 기준 주소 — NEXT_PUBLIC_SITE_URL 이 https 면 그것, 아니면 문안 하단 주소.
export function siteBase(): string {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim().replace(/\/+$/, '')
  return env && env.startsWith('https://') ? env : `https://${SMS_SITE_HOST}`
}

// #{계좌정보} — 현재 일반계좌(사이트 입금 안내와 같은 값, lib/siteMeta). 자리표시 계좌면 누락 → 보류.
// 추후 PG 연동 시 해당 납부 건의 가상계좌로 바꾼다.
function depositAccount(): string | null {
  return fmtAccount({ bank: PLACEHOLDER_ORG.bank, account: PLACEHOLDER_ORG.account, holder: PLACEHOLDER_ORG.accountHolder })
}

interface AppRow {
  id: string
  application_no: string
  applicant_name: string
  payer_name: string | null
  phone: string
  total_amount: number
  refunded_amount: number
  due_amount: number
  is_waitlisted: boolean | null
  session_id: string | null
  created_at: string
  session: { label: string; starts_on: string; ends_on: string; nights: number } | null
}

async function loadApp(appId: string): Promise<{ row: AppRow; common: SmsVars } | null> {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(
      'id, application_no, applicant_name, payer_name, phone, total_amount, refunded_amount, due_amount, is_waitlisted, session_id, created_at, ' +
        'session:sessions(label, starts_on, ends_on, nights)',
    )
    .eq('id', appId)
    .maybeSingle()
  if (error || !data) return null
  const row = data as unknown as AppRow
  const sRaw = row.session as AppRow['session'] | NonNullable<AppRow['session']>[]
  const s = Array.isArray(sRaw) ? sRaw[0] ?? null : sRaw
  return {
    row,
    common: {
      신청자명: row.applicant_name,
      신청자: row.applicant_name, // 추가입금 안내 템플릿만 #{신청자}
      신청번호: row.application_no,
      신청차수: s?.label ?? null,
      일정: s ? fmtSchedule(s.starts_on, s.ends_on, s.nights) : null,
    },
  }
}

// 추가납부 시작 시각 — 열(36 SQL)이 없거나 조회 실패면 null.
async function dueStartedAt(appId: string): Promise<string | null> {
  const { data, error } = await supabaseAdmin.from('applications').select('*').eq('id', appId).maybeSingle()
  if (error || !data) return null
  return (data as { due_started_at?: string | null }).due_started_at ?? null
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

function send(
  kind: SmsKind,
  dedupeKey: string,
  a: { row: AppRow; common: SmsVars },
  vars: SmsVars,
  refundRequestId: string | null = null,
) {
  const { message, missing } = renderSms(kind, { ...a.common, ...vars })
  return smsDispatcher().dispatch({
    kind,
    dedupeKey,
    applicationId: a.row.id,
    refundRequestId,
    recipient: a.row.phone,
    message,
    missing,
  })
}

// 1. 접수완료·입금안내 — 신청 저장 직후(예비 제외), 예비는 정원 편입(승인) 시. 신청당 1회.
//    deadlineBaseIso = 입금기한 기준 시각(신청 시각 또는 편입 시각) — 자동취소와 같은 계산.
export async function notifyDepositNotice(appId: string, deadlineBaseIso: string): Promise<void> {
  await depositNotice('deposit_notice', appId, deadlineBaseIso)
}

// 1-2. 예비접수 입금 안내 — 예비 → 정원 편입(승인) 시. 내용은 접수완료·입금안내와 같고 템플릿만 다르다. 신청당 1회.
export async function notifyWaitlistDepositNotice(appId: string, releasedAtIso: string): Promise<void> {
  await depositNotice('waitlist_deposit_notice', appId, releasedAtIso)
}

async function depositNotice(kind: 'deposit_notice' | 'waitlist_deposit_notice', appId: string, deadlineBaseIso: string) {
  await safe(kind, appId, async () => {
    const a = await loadApp(appId)
    if (!a) return null
    return send(kind, `${kind}:${appId}`, a, {
      결제금액: fmtAmount(a.row.total_amount),
      계좌정보: depositAccount(),
      입금기한: kstDate(depositDeadline(deadlineBaseIso).toISOString()),
      입금자명: a.row.payer_name?.trim() || a.row.applicant_name,
    })
  })
}

// #{예비번호} — 같은 차수에서 아직 예비(진행 중 상태)인 신청 가운데 이 신청의 순번(먼저 접수한 순, 1부터).
// 앞선 예비가 취소·편입되면 이후 접수자의 번호가 당겨진다. 안내 시점 값이며 이력에 그대로 남는다. 조회 실패면 null(보류).
async function waitlistNumber(row: AppRow): Promise<string | null> {
  if (!row.session_id || !row.is_waitlisted) return null
  const { count, error } = await supabaseAdmin
    .from('applications')
    .select('id', { count: 'exact', head: true })
    .eq('session_id', row.session_id)
    .eq('is_waitlisted', true)
    .in('status', ['pending', 'paid', 'completed'])
    .lte('created_at', row.created_at)
  if (error || !count) return null
  return String(count)
}

// 1-1. 예비 접수 완료 — 정원 초과(예비)로 신청 저장 직후. 금액·계좌·입금기한 없음, 예비번호 포함. 신청당 1회.
//      정원 편입 확정 시에는 예비접수 입금 안내(notifyWaitlistDepositNotice)가 따로 나간다.
export async function notifyWaitlistNotice(appId: string): Promise<void> {
  await safe('waitlist_notice', appId, async () => {
    const a = await loadApp(appId)
    if (!a) return null
    return send('waitlist_notice', `waitlist_notice:${appId}`, a, { 예비번호: await waitlistNumber(a.row) })
  })
}

// 2. 입금확인 — 최초 입금확인 저장 후. 신청당 1회(되돌림 후 재확인해도 재발송하지 않음).
export async function notifyDepositInitial(appId: string): Promise<void> {
  await safe('deposit_initial', appId, async () => {
    const a = await loadApp(appId)
    if (!a) return null
    const amount = (a.row.total_amount ?? 0) - (a.row.refunded_amount ?? 0)
    return send('deposit_initial', `deposit_initial:${appId}`, a, {
      확인금액: amount > 0 ? fmtAmount(amount) : null,
      참가상태: a.row.is_waitlisted ? '예비' : '확정',
    })
  })
}

// 3. 추가입금 안내 — 수정 반영으로 입금확정 건에 부족분이 생긴 뒤(연수 직전 수정 포함). 수정요청 건당 1회.
//    #{추가금액} = 반영 후 미납 부족분(due_amount) — 입금확인(confirmDuePayment)이 이 금액 전체를 확인한다.
//    #{추가결제금액} = 수정 후 총 참가비(total_amount). #{신청자} = 신청자명(이 템플릿만 변수명이 다름).
//    #{입금기한} = 추가납부 시작일 + 7일. 시작일 = 부족분이 0 에서 처음 생긴 안내 시각(applications.due_started_at).
//                 미납 중 추가 수정으로 금액이 늘어도 첫 기한을 유지한다(연장 없음). 열이 없거나 비면 이번 안내 시각.
//                 문안과 함께 이력에 저장 → 재발송해도 기한 그대로.
export async function notifyDueNotice(appId: string, modificationRequestId: string, noticeIso: string = new Date().toISOString()): Promise<void> {
  await safe('due_notice', appId, async () => {
    const a = await loadApp(appId)
    if (!a) return null
    const startedAt = await dueStartedAt(appId)
    return send('due_notice', `due_notice:${appId}:${modificationRequestId}`, a, {
      추가금액: a.row.due_amount > 0 ? fmtAmount(a.row.due_amount) : null,
      계좌정보: depositAccount(),
      추가결제금액: fmtAmount(a.row.total_amount), // 수정 후 총 참가비(2026-10-05 사용자 결정 — 예전 '총 참가비' 자리)
      입금기한: kstDate(dueDeadline(startedAt ?? noticeIso).toISOString()),
    })
  })
}

// 4. 추가입금 확인 — 수정 증액 부족분 입금확인 후. 추가입금 주기(총액·확인액) 단위 1회.
export async function notifyDepositAdditional(appId: string, amount: number): Promise<void> {
  await safe('deposit_additional', appId, async () => {
    const a = await loadApp(appId)
    if (!a) return null
    return send('deposit_additional', `deposit_additional:${appId}:${a.row.total_amount}:${amount}`, a, {
      추가금액: amount > 0 ? fmtAmount(amount) : null,
      총결제금액: fmtAmount(a.row.total_amount),
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

// 5. 환불접수 — 환불 요청 건당 1회. 관리자 직접 환불(접수 즉시 완료)은 완료 안내만 보낸다.
//    #{환불구분}: 수정 감액 자동 접수 = 부분, 고객 환불(신청 취소) 요청 = 전체.
//    #{요청금액}: 요청 건에 금액이 있으면 그 값(수정 감액분). 고객 요청은 금액 입력이 없어 현재 환불 가능 금액 전액
//                 (받은 돈 − 이미 환불한 금액, lib/refundMath)을 요청금액으로 본다 — 최종 금액은 규정에 따라 달라질 수 있음(문안 명시).
export async function notifyRefundReceived(refundId: string): Promise<void> {
  await safe('refund_received', refundId, async () => {
    const r = await loadRefund(refundId)
    if (!r || !r.application_id || r.origin === 'admin') return null
    const a = await loadApp(r.application_id)
    if (!a) return null
    const requested =
      r.amount != null && r.amount > 0 ? r.amount : r.origin === 'user' ? ((await loadLedger(r.application_id))?.refundable ?? 0) : 0
    return send(
      'refund_received',
      `refund_received:${refundId}`,
      a,
      {
        환불구분: r.origin === 'modification' ? '부분' : '전체',
        요청금액: requested > 0 ? fmtAmount(requested) : null,
        접수일: kstDate(r.created_at),
      },
      refundId,
    )
  })
}

// 6. 환불완료 — 환불 확정(송금 완료 처리) 저장 후, 환불 건당 1회. amount = 이번 실제 지급액, full = 전액 환불(신청 환불완료 전환).
export async function notifyRefundCompleted(refundId: string, amount: number, full: boolean): Promise<void> {
  await safe('refund_completed', refundId, async () => {
    const r = await loadRefund(refundId)
    if (!r || !r.application_id) return null
    const a = await loadApp(r.application_id)
    if (!a) return null
    return send(
      'refund_completed',
      `refund_completed:${refundId}`,
      a,
      {
        환불구분: full ? '전체' : '부분',
        환불금액: amount > 0 ? fmtAmount(amount) : null,
        처리일: kstDate(new Date().toISOString()),
      },
      refundId,
    )
  })
}

// 7. 자동취소 — 취소(00:10 cron) 후 오전 10시 일괄 안내에서, 그때도 취소 상태인 건만. 신청당 1회.
export async function notifyAutoCancelled(appId: string, cancelledAtIso: string): Promise<void> {
  await safe('auto_cancelled', appId, async () => {
    const a = await loadApp(appId)
    if (!a) return null
    return send('auto_cancelled', `auto_cancelled:${appId}`, a, {
      취소일: kstDate(cancelledAtIso),
      취소사유: '입금기한 경과',
    })
  })
}

// 8. 행사 1주일 전 안내 — 오전 10시 일괄(D-7) 또는 시작 7일 미만 시점의 늦은 입금확인 시(lib/dailyNotices). 신청·차수 시작일 단위 1회. noticeUrl 없으면 보류.
export async function notifyEventReminder(appId: string, startsOn: string, noticeUrl: string | null): Promise<void> {
  await safe('event_reminder', appId, async () => {
    const a = await loadApp(appId)
    if (!a) return null
    return send('event_reminder', `event_reminder:${appId}:${startsOn}`, a, { 홈페이지차수별안내사항url주소: noticeUrl })
  })
}
