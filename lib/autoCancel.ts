import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'
import { autoCancelCutoff, deadlineBase, isPastDeadline } from './depositDeadline'
import { notifyAutoCancelled } from './sms'

// 입금기한 경과 자동취소 — 하루 1회 cron(app/api/cron/auto-cancel).
// 대상: status=pending · 입금 신고 없음 · 예비 아님 · 자동취소 이력 없음 · 기한 경과(신청일, 예비 승인 건은 승인일 기준).
// 제외: 입금 신고 건(관리자 대조 대기), 예비 건, 관리자가 자동취소를 복구한 건(auto_cancelled_at 보존).
// execute=false 면 대상만 집계(점검 모드). 취소는 조건부 갱신 — 그 사이 입금확인·신고·승인된 건은 건너뛴다.
// deposit_confirmed_at·금액·현금영수증은 건드리지 않는다(미입금 건이므로 발급 이력 없음).

export interface AutoCancelResult {
  ok: boolean
  mode: 'execute' | 'dry-run'
  cutoff: string
  candidates: number
  cancelled: string[] // application_no
  skipped: number // 조건부 갱신에서 빠진 건(그 사이 상태 변경)
  error?: string
}

interface Row {
  id: string
  application_no: string
  created_at: string
  waitlist_released_at: string | null
}

export async function runAutoCancel(opts: { execute: boolean; now?: Date }): Promise<AutoCancelResult> {
  const now = opts.now ?? new Date()
  const cutoff = autoCancelCutoff(now)
  const mode = opts.execute ? 'execute' : 'dry-run'
  const base = { mode, cutoff: cutoff.toISOString() } as const
  try {
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select('id, application_no, created_at, waitlist_released_at')
      .eq('status', 'pending')
      .is('payment_claimed_at', null)
      .eq('is_waitlisted', false)
      .is('auto_cancelled_at', null)
      .lt('created_at', cutoff.toISOString())
      .order('created_at', { ascending: true })
      .limit(500)
    if (error) throw error
    const rows = ((data as Row[]) ?? []).filter((r) => isPastDeadline(deadlineBase(r.created_at, r.waitlist_released_at), now))
    if (!opts.execute) return { ok: true, ...base, candidates: rows.length, cancelled: rows.map((r) => r.application_no), skipped: 0 }

    const cancelled: string[] = []
    let skipped = 0
    for (const r of rows) {
      const stamp = new Date().toISOString()
      const { data: upd, error: uErr } = await supabaseAdmin
        .from('applications')
        .update({ status: 'cancelled', auto_cancelled_at: stamp, updated_at: stamp })
        .eq('id', r.id)
        .eq('status', 'pending')
        .is('payment_claimed_at', null)
        .eq('is_waitlisted', false)
        .is('auto_cancelled_at', null)
        .select('id')
      if (uErr) throw uErr
      if (!upd || upd.length === 0) {
        skipped++
        continue
      }
      cancelled.push(r.application_no)
      // 취소 문자 — 저장 성공 후, 신청당 1회. 실패해도 취소 유지.
      await notifyAutoCancelled(r.id, stamp)
    }
    return { ok: true, ...base, candidates: rows.length, cancelled, skipped }
  } catch (e) {
    const code = (e as { code?: string })?.code ?? (e instanceof Error ? e.message : 'unknown')
    console.error('[auto-cancel]', code)
    return { ok: false, ...base, candidates: 0, cancelled: [], skipped: 0, error: code }
  }
}
