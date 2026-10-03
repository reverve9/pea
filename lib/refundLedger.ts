import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'
import { refundableAmount, type LedgerInput } from './refundMath'

// 환불 합계 서버 계산 — 환불 기록(refund_requests)이 원본, applications.refunded_amount 는 그 합계 캐시.
// 기록 금액: amount = 요청(예상)액(수정 감액 건은 감액분), paid_amount = 실제 지급액(확정 시 기록, 36 SQL).
// 지급액이 없으면(관리자 직접 환불·36 적용 전 기록) amount 를 지급액으로 본다.
type RefundRow = { origin: string; amount: number | null; paid_amount?: number | null; status: string }
const paidOf = (r: RefundRow) => r.paid_amount ?? r.amount ?? 0

// 확정 지급액 기록. paid_amount 열이 없으면(36 적용 전) 예전처럼 amount 에 기록한다.
export async function setPaidAmount(reqId: string, paid: number | null): Promise<void> {
  const { error } = await supabaseAdmin.from('refund_requests').update({ paid_amount: paid }).eq('id', reqId)
  if (!error) return
  if (error.code !== '42703' && error.code !== 'PGRST204') throw error
  if (paid == null) return
  const { error: e2 } = await supabaseAdmin.from('refund_requests').update({ amount: paid }).eq('id', reqId)
  if (e2) throw e2
}

// 신청별 수정 감액 환불 금액 합.
export async function modRefundTotals(appIds?: string[]): Promise<Map<string, number>> {
  const out = new Map<string, number>()
  let q = supabaseAdmin.from('refund_requests').select('application_id, amount').eq('origin', 'modification')
  if (appIds) {
    if (!appIds.length) return out
    q = q.in('application_id', appIds)
  }
  const { data, error } = await q
  if (error) throw error
  for (const r of (data as { application_id: string | null; amount: number | null }[]) ?? []) {
    if (!r.application_id) continue
    out.set(r.application_id, (out.get(r.application_id) ?? 0) + (r.amount ?? 0))
  }
  return out
}

// 한 신청의 현재 장부 — 환불 합계는 완료 기록에서 새로 센다.
export async function loadLedger(appId: string): Promise<(LedgerInput & { status: string; refundable: number }) | null> {
  const { data: app, error } = await supabaseAdmin
    .from('applications').select('total_amount, due_amount, status').eq('id', appId).maybeSingle()
  if (error) throw error
  if (!app) return null
  const { data: rs, error: rErr } = await supabaseAdmin.from('refund_requests').select('*').eq('application_id', appId)
  if (rErr) throw rErr
  const rows = (rs as RefundRow[]) ?? []
  const l: LedgerInput = {
    total_amount: app.total_amount ?? 0,
    due_amount: app.due_amount ?? 0,
    refunded_amount: rows.filter((r) => r.status === 'completed').reduce((n, r) => n + paidOf(r), 0),
    mod_refund_amount: rows.filter((r) => r.origin === 'modification').reduce((n, r) => n + (r.amount ?? 0), 0),
  }
  return { ...l, status: app.status as string, refundable: refundableAmount(l) }
}

// refunded_amount = 완료된 환불 기록 합계로 다시 맞춘다. 반환 = 새 합계.
export async function recalcRefunded(appId: string, extra: Record<string, unknown> = {}): Promise<number> {
  const { data, error } = await supabaseAdmin.from('refund_requests').select('*').eq('application_id', appId).eq('status', 'completed')
  if (error) throw error
  const sum = ((data as RefundRow[]) ?? []).reduce((n, r) => n + paidOf(r), 0)
  const { error: uErr } = await supabaseAdmin
    .from('applications')
    .update({ refunded_amount: sum, updated_at: new Date().toISOString(), ...extra })
    .eq('id', appId)
  if (uErr) throw uErr
  return sum
}
