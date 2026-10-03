'use server'

import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { smsDispatcher } from '@/lib/sms'
import { MISSING_PREFIX, errorLabel, isStaleSending } from '@/lib/sms/dispatcher'
import type { SmsKind, SmsLog, SmsStatus } from '@/lib/sms/types'

// 문자 발송 이력·재발송·결과 조회(관리자). requireAdmin 후 service_role.
// 테이블 미적용(31_sms_notifications.sql 전)이면 unavailable 로 조용히 비운다(발송도 일어나지 않음).

export type SmsViewStatus = SmsStatus | 'stale'
export interface SmsRowView {
  id: string
  application_id: string | null
  kind: SmsKind
  status: SmsViewStatus
  msg_type: string
  recipient: string
  body: string
  attempts: number
  error: string | null
  incomplete: boolean // 필수 변수 누락 보류 — 문안 불완전이라 재발송 불가
  created_at: string
  sent_at: string | null
}
export type SmsListResult = { ok: true; rows: SmsRowView[]; unavailable?: boolean } | { ok: false; error: string }
export type SmsActionResult = { ok: true; message: string } | { ok: false; error: string }

const COLS = 'id, application_id, kind, status, msg_type, recipient, body, attempts, last_error, provider_status_code, provider_status_message, created_at, updated_at, sent_at'
const isMissingTable = (code?: string) => code === '42P01' || code === 'PGRST205'

function view(r: SmsLog, now: Date): SmsRowView {
  const masked = r.recipient.replace(/^(\d{3})\d+(\d{4})$/, '$1-****-$2')
  return {
    id: r.id,
    application_id: r.application_id,
    kind: r.kind,
    status: isStaleSending(r, now) ? 'stale' : r.status,
    msg_type: r.msg_type,
    recipient: masked,
    body: r.body,
    attempts: r.attempts,
    error: r.status === 'sent' && !r.last_error ? null : r.last_error || r.provider_status_message ? errorLabel(r) : null,
    incomplete: !!r.last_error?.startsWith(MISSING_PREFIX),
    created_at: r.created_at,
    sent_at: r.sent_at,
  }
}

export async function listSmsForApplication(applicationId: string): Promise<SmsListResult> {
  try {
    await requireAdmin()
    const { data, error } = await supabaseAdmin
      .from('sms_notifications').select(COLS).eq('application_id', applicationId).order('created_at', { ascending: true })
    if (error) {
      if (isMissingTable(error.code)) return { ok: true, rows: [], unavailable: true }
      throw error
    }
    const now = new Date()
    return { ok: true, rows: ((data as unknown as SmsLog[]) ?? []).map((r) => view(r, now)) }
  } catch (e) {
    console.error('[sms] list:', e)
    return { ok: false, error: '문자 이력을 불러오지 못했습니다.' }
  }
}

// 확인 필요 목록 — 실패·보류·결과 불명확·오래된 발송중. 신청관리 상단 안내용.
export async function listSmsAttention(): Promise<SmsListResult> {
  try {
    await requireAdmin()
    const { data, error } = await supabaseAdmin
      .from('sms_notifications')
      .select(COLS)
      .in('status', ['failed', 'held', 'unknown', 'sending'])
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) {
      if (isMissingTable(error.code)) return { ok: true, rows: [], unavailable: true }
      throw error
    }
    const now = new Date()
    const rows = ((data as unknown as SmsLog[]) ?? []).map((r) => view(r, now)).filter((r) => r.status !== 'sending')
    return { ok: true, rows }
  } catch (e) {
    console.error('[sms] attention:', e)
    return { ok: false, error: '문자 확인 목록을 불러오지 못했습니다.' }
  }
}

async function run(tag: string, fn: () => Promise<SmsActionResult>): Promise<SmsActionResult> {
  try {
    await requireAdmin()
    return await fn()
  } catch (e) {
    console.error(`[sms] ${tag}:`, e instanceof Error ? e.message : '')
    return { ok: false, error: '처리에 실패했습니다.' }
  }
}

export async function resendSms(id: string): Promise<SmsActionResult> {
  return run('resend', () => smsDispatcher().resend(id))
}

export async function checkSms(id: string): Promise<SmsActionResult> {
  return run('check', () => smsDispatcher().check(id))
}

export async function resolveSms(id: string, result: 'sent' | 'failed'): Promise<SmsActionResult> {
  if (result !== 'sent' && result !== 'failed') return { ok: false, error: '알 수 없는 처리입니다.' }
  return run('resolve', () => smsDispatcher().markResolved(id, result))
}
