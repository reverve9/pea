import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'
import { notifyEventReminder, siteBase } from './sms'

// 차수 1주일 전 안내 — 하루 1회 cron(app/api/cron/event-reminder).
// 대상: 시작일이 오늘(KST)+7일인 차수의 입금확정(paid·completed) 신청, 예비 제외. 미입금·취소·환불 건은 보내지 않는다.
// #{공지URL}: 차수에 연결한 공지(sessions.notice_id, 연수 관리에서 지정)가 게시 중일 때만 — 없으면 문자는 보류(누락 항목 표시).
// execute=false 면 대상만 집계(점검 모드).

export const REMINDER_DAYS = 7
const KST_MS = 9 * 3600 * 1000

export interface EventReminderResult {
  ok: boolean
  mode: 'execute' | 'dry-run'
  targetDate: string // YYYY-MM-DD (KST)
  sessions: { label: string; noticeLinked: boolean; applications: number }[]
  dispatched: number
  error?: string
}

// KST 기준 오늘 + days 의 날짜(YYYY-MM-DD).
export function kstDatePlus(now: Date, days: number): string {
  const k = new Date(now.getTime() + KST_MS)
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() + days)).toISOString().slice(0, 10)
}

// 차수별 공지 링크 — notice_id 열(34_sms_templates_v2.sql) 미적용·미연결·미게시면 null.
async function noticeUrls(sessionIds: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>(sessionIds.map((id) => [id, null]))
  const { data, error } = await supabaseAdmin.from('sessions').select('id, notice_id').in('id', sessionIds)
  if (error) {
    console.error('[event-reminder] notice_id:', error.code)
    return out
  }
  const rows = (data as { id: string; notice_id: string | null }[]) ?? []
  const noticeIds = [...new Set(rows.map((r) => r.notice_id).filter((v): v is string => !!v))]
  if (!noticeIds.length) return out
  const { data: ns, error: nErr } = await supabaseAdmin.from('notices').select('id').in('id', noticeIds).eq('is_published', true)
  if (nErr) {
    console.error('[event-reminder] notices:', nErr.code)
    return out
  }
  const published = new Set(((ns as { id: string }[]) ?? []).map((n) => n.id))
  for (const r of rows) {
    if (r.notice_id && published.has(r.notice_id)) out.set(r.id, `${siteBase()}/community/notices/${r.notice_id}`)
  }
  return out
}

export async function runEventReminder(opts: { execute: boolean; now?: Date }): Promise<EventReminderResult> {
  const now = opts.now ?? new Date()
  const targetDate = kstDatePlus(now, REMINDER_DAYS)
  const mode = opts.execute ? 'execute' : 'dry-run'
  try {
    const { data: ss, error: sErr } = await supabaseAdmin.from('sessions').select('id, label, starts_on').eq('starts_on', targetDate)
    if (sErr) throw sErr
    const sessions = (ss as { id: string; label: string; starts_on: string }[]) ?? []
    if (!sessions.length) return { ok: true, mode, targetDate, sessions: [], dispatched: 0 }

    const urls = await noticeUrls(sessions.map((s) => s.id))
    const { data: apps, error: aErr } = await supabaseAdmin
      .from('applications')
      .select('id, session_id')
      .in('session_id', sessions.map((s) => s.id))
      .in('status', ['paid', 'completed'])
      .eq('is_waitlisted', false)
      .order('created_at', { ascending: true })
      .limit(2000)
    if (aErr) throw aErr
    const rows = (apps as { id: string; session_id: string }[]) ?? []

    const summary = sessions.map((s) => ({
      label: s.label,
      noticeLinked: !!urls.get(s.id),
      applications: rows.filter((r) => r.session_id === s.id).length,
    }))
    if (!opts.execute) return { ok: true, mode, targetDate, sessions: summary, dispatched: 0 }

    const byId = new Map(sessions.map((s) => [s.id, s]))
    for (const r of rows) {
      const s = byId.get(r.session_id)!
      await notifyEventReminder(r.id, s.starts_on, urls.get(s.id) ?? null)
    }
    return { ok: true, mode, targetDate, sessions: summary, dispatched: rows.length }
  } catch (e) {
    const code = (e as { code?: string })?.code ?? (e instanceof Error ? e.message : 'unknown')
    console.error('[event-reminder]', code)
    return { ok: false, mode, targetDate, sessions: [], dispatched: 0, error: code }
  }
}
