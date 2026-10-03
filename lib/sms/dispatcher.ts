// 문자 발송 핵심 흐름 — 저장/외부 호출은 포트로 주입(서버: Supabase+솔라피, 시험: 메모리+모의).
// 규칙:
//  · dedupe_key 등록에 성공한 요청만 발송한다(중복 등록 = 발송 안 함). 등록 실패(DB 오류·미적용)도 발송 안 함.
//  · 발송 직전 sending + attempts 를 기록하고, 결과는 같은 status·attempts 일 때만 반영(늦은 결과가 덮어쓰지 않음).
//  · unknown(결과 불명확)은 재발송 금지 — 조회로 미발송이 확인되거나 관리자가 미발송을 확인한 뒤에만 failed → 재발송.
//  · 어떤 경우에도 예외를 호출측(업무 저장)으로 던지지 않는다.
import { holdReason, isValidRecipient, digits } from './config'
import type { SendOutcome, SmsConfig, SmsKind, SmsLog, SmsMessage, SmsProvider, SmsStatus, SmsStore } from './types'

export const STALE_SENDING_MS = 2 * 60 * 1000
export const LOOKUP_NOT_FOUND_GRACE_MS = 10 * 60 * 1000
const OK_CODES = new Set(['2000', '3000', '4000']) // 접수 · 이통사 처리 중 · 수신 완료

export interface DispatchInput {
  kind: SmsKind
  dedupeKey: string
  applicationId: string | null
  refundRequestId: string | null
  recipient: string
  message: SmsMessage
}

export type DispatchResult =
  | { outcome: 'duplicate' }
  | { outcome: 'store_error'; error: string }
  | { outcome: SmsStatus; id: string; detail: string | null }

export type ActionOutcome = { ok: true; message: string } | { ok: false; error: string }

export function isStaleSending(row: SmsLog, now: Date): boolean {
  return row.status === 'sending' && now.getTime() - new Date(row.updated_at).getTime() > STALE_SENDING_MS
}

function resultPatch(out: SendOutcome, now: Date): Partial<SmsLog> {
  if (out.kind === 'accepted') {
    return {
      status: 'sent',
      provider_message_id: out.messageId,
      provider_group_id: out.groupId,
      provider_status_code: out.statusCode,
      provider_status_message: out.statusMessage,
      last_error: null,
      sent_at: now.toISOString(),
    }
  }
  if (out.kind === 'rejected') {
    return { status: 'failed', provider_status_code: out.statusCode, provider_status_message: out.statusMessage, last_error: out.error }
  }
  return { status: 'unknown', last_error: out.error }
}

export function createDispatcher(deps: {
  store: SmsStore
  config: SmsConfig
  provider: SmsProvider | null
  now?: () => Date
}) {
  const { store, config, provider } = deps
  const now = deps.now ?? (() => new Date())

  async function attempt(row: SmsLog): Promise<SmsLog> {
    let out: SendOutcome
    try {
      if (!provider || !config.sender) throw new Error('provider_unavailable')
      out = await provider.send({
        to: row.recipient,
        from: config.sender,
        message: { type: row.msg_type, subject: row.subject, text: row.body },
        notificationId: row.id,
      })
    } catch {
      out = { kind: 'unknown', error: 'send_exception' }
    }
    const updated = await store.update(row.id, { status: ['sending'], attempts: row.attempts }, resultPatch(out, now()))
    return updated ?? row
  }

  async function dispatch(input: DispatchInput): Promise<DispatchResult> {
    try {
      const to = digits(input.recipient)
      const invalid = !isValidRecipient(to)
      const hold = invalid ? null : holdReason(config, to)
      const status: SmsStatus = invalid ? 'failed' : hold ? 'held' : 'sending'
      const ins = await store.insert({
        dedupe_key: input.dedupeKey,
        kind: input.kind,
        application_id: input.applicationId,
        refund_request_id: input.refundRequestId,
        recipient: to,
        msg_type: input.message.type,
        subject: input.message.subject,
        body: input.message.text,
        status,
        attempts: status === 'sending' ? 1 : 0,
        last_error: invalid ? 'invalid_recipient' : hold,
      })
      if (ins.kind === 'duplicate') return { outcome: 'duplicate' }
      if (ins.kind === 'error') return { outcome: 'store_error', error: ins.error }
      if (status !== 'sending') return { outcome: status, id: ins.row.id, detail: ins.row.last_error }
      const done = await attempt(ins.row)
      return { outcome: done.status, id: done.id, detail: done.last_error }
    } catch (e) {
      return { outcome: 'store_error', error: e instanceof Error ? e.message : 'unknown' }
    }
  }

  // 재발송 — failed·held 만. 저장된 문안 그대로(재처리 시점 정보로 다시 만들지 않음).
  async function resend(id: string): Promise<ActionOutcome> {
    const row = await store.get(id)
    if (!row) return { ok: false, error: '발송 이력을 찾을 수 없습니다.' }
    if (row.status === 'sent') return { ok: false, error: '이미 발송된 문자입니다.' }
    if (row.status === 'unknown' || row.status === 'sending')
      return { ok: false, error: '발송 결과가 확인되지 않았습니다. 먼저 결과 조회(또는 미발송 확인)를 해 주세요.' }
    if (!isValidRecipient(row.recipient)) return { ok: false, error: '수신번호가 올바르지 않아 발송할 수 없습니다.' }
    const hold = holdReason(config, row.recipient)
    if (hold) {
      await store.update(id, { status: [row.status], attempts: row.attempts }, { last_error: hold })
      return { ok: false, error: holdMessage(hold) }
    }
    const claimed = await store.update(
      id,
      { status: [row.status], attempts: row.attempts },
      { status: 'sending', attempts: row.attempts + 1, last_error: null },
    )
    if (!claimed) return { ok: false, error: '다른 요청이 이미 처리 중입니다. 새로고침 후 확인해 주세요.' }
    const done = await attempt(claimed)
    if (done.status === 'sent') return { ok: true, message: '재발송이 접수되었습니다.' }
    if (done.status === 'unknown') return { ok: false, error: '재발송 결과가 불명확합니다. 잠시 후 결과 조회를 해 주세요.' }
    return { ok: false, error: `재발송에 실패했습니다. (${errorLabel(done)})` }
  }

  // 결과 조회 — unknown·오래된 sending·sent(전달 결과). 미발송이 확인될 때만 failed 로 전환.
  async function check(id: string): Promise<ActionOutcome> {
    const row = await store.get(id)
    if (!row) return { ok: false, error: '발송 이력을 찾을 수 없습니다.' }
    const t = now()
    const checkable = row.status === 'unknown' || row.status === 'sent' || isStaleSending(row, t)
    if (!checkable) return { ok: false, error: '조회 대상이 아닙니다.' }
    if (!provider || !config.sender) return { ok: false, error: holdMessage(`config_missing:${config.missing.join(',')}`) }
    const since = new Date(new Date(row.created_at).getTime() - 60_000).toISOString()
    let out
    try {
      out = await provider.lookup({ messageId: row.provider_message_id, to: row.recipient, from: config.sender, notificationId: row.id, since })
    } catch {
      out = { kind: 'error' as const, error: 'lookup_exception' }
    }
    const expect = { status: [row.status], attempts: row.attempts }
    if (out.kind === 'found') {
      const ok = out.statusCode == null || OK_CODES.has(out.statusCode)
      const patch: Partial<SmsLog> = ok
        ? {
            status: 'sent',
            provider_message_id: out.messageId,
            provider_group_id: out.groupId ?? row.provider_group_id,
            provider_status_code: out.statusCode,
            provider_status_message: out.statusMessage,
            last_error: null,
            sent_at: row.sent_at ?? t.toISOString(),
          }
        : {
            status: 'failed',
            provider_message_id: out.messageId,
            provider_status_code: out.statusCode,
            provider_status_message: out.statusMessage,
            last_error: `delivery_failed:${out.statusCode}`,
          }
      const upd = await store.update(id, expect, patch)
      if (!upd) return { ok: false, error: '다른 요청이 먼저 처리했습니다. 새로고침 후 확인해 주세요.' }
      if (!ok) return { ok: true, message: `전달 실패로 확인되었습니다(코드 ${out.statusCode}). 재발송할 수 있습니다.` }
      return { ok: true, message: out.statusCode === '4000' ? '수신 완료로 확인되었습니다.' : '발송 접수(전달 처리 중)로 확인되었습니다.' }
    }
    if (out.kind === 'ambiguous')
      return { ok: false, error: `같은 번호로 발송된 건이 ${out.count}건 있어 자동 판정할 수 없습니다. 솔라피 발송내역에서 확인 후 수동으로 처리해 주세요.` }
    if (out.kind === 'error') return { ok: false, error: `조회에 실패했습니다(${out.error}). 잠시 후 다시 시도해 주세요.` }
    // not_found
    if (row.status === 'sent' || row.provider_message_id) return { ok: false, error: '솔라피에서 조회되지 않습니다. 잠시 후 다시 확인해 주세요.' }
    if (t.getTime() - new Date(row.created_at).getTime() < LOOKUP_NOT_FOUND_GRACE_MS)
      return { ok: false, error: '아직 조회되지 않습니다. 10분 뒤 다시 조회해 주세요.' }
    const upd = await store.update(id, expect, { status: 'failed', last_error: 'lookup_not_found' })
    if (!upd) return { ok: false, error: '다른 요청이 먼저 처리했습니다. 새로고침 후 확인해 주세요.' }
    return { ok: true, message: '발송 내역이 없어 미발송으로 확인되었습니다. 재발송할 수 있습니다.' }
  }

  // 관리자 수동 판정 — 솔라피 콘솔에서 확인한 결과를 반영(unknown·오래된 sending 만).
  async function markResolved(id: string, result: 'sent' | 'failed'): Promise<ActionOutcome> {
    const row = await store.get(id)
    if (!row) return { ok: false, error: '발송 이력을 찾을 수 없습니다.' }
    if (!(row.status === 'unknown' || isStaleSending(row, now()))) return { ok: false, error: '결과 불명확 상태가 아닙니다.' }
    const patch: Partial<SmsLog> =
      result === 'sent'
        ? { status: 'sent', last_error: 'manual_confirmed_sent', sent_at: row.sent_at ?? now().toISOString() }
        : { status: 'failed', last_error: 'manual_confirmed_not_sent' }
    const upd = await store.update(id, { status: [row.status], attempts: row.attempts }, patch)
    if (!upd) return { ok: false, error: '다른 요청이 먼저 처리했습니다. 새로고침 후 확인해 주세요.' }
    return { ok: true, message: result === 'sent' ? '발송됨으로 표시했습니다.' : '미발송으로 표시했습니다. 재발송할 수 있습니다.' }
  }

  return { dispatch, resend, check, markResolved }
}

// 관리자 화면용 사유 문구 — 비밀값 없이 키 이름만.
export function holdMessage(reason: string): string {
  if (reason.startsWith('config_missing:')) return `문자 설정이 없어 발송하지 않았습니다. 필요한 설정: ${reason.slice(15)}`
  if (reason === 'disabled') return '문자 발송이 꺼져 있어(SMS_ENABLED) 발송하지 않았습니다.'
  if (reason === 'not_in_allowlist') return '테스트 허용번호(SMS_TEST_ALLOWLIST)에 없는 번호라 발송하지 않았습니다.'
  return reason
}

export function errorLabel(row: Pick<SmsLog, 'last_error' | 'provider_status_code' | 'provider_status_message'>): string {
  const e = row.last_error ?? ''
  if (!e) return row.provider_status_message ?? '-'
  if (e.startsWith('config_missing:') || e === 'disabled' || e === 'not_in_allowlist') return holdMessage(e)
  const map: Record<string, string> = {
    invalid_recipient: '수신번호 형식 오류',
    timeout: '응답 시간 초과(결과 불명확)',
    network_error: '네트워크 오류(결과 불명확)',
    send_exception: '발송 처리 오류(결과 불명확)',
    unexpected_response: '응답 해석 불가(결과 불명확)',
    registration_failed: '솔라피 접수 실패',
    lookup_not_found: '조회 결과 미발송 확인',
    manual_confirmed_not_sent: '관리자 미발송 확인',
    manual_confirmed_sent: '관리자 발송 확인',
  }
  const base = map[e] ?? (e.startsWith('delivery_failed:') ? '전달 실패' : e.startsWith('http_') ? `솔라피 오류 ${e.slice(5)}` : e)
  const detail = row.provider_status_message ? ` · ${row.provider_status_code ?? ''} ${row.provider_status_message}`.trimEnd() : ''
  return base + detail
}
