import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'
import { notifyAutoCancelled, notifyEventReminder, siteBase } from './sms'

// 오전 10:00(KST) 일괄 안내 — 하루 1회 cron(app/api/cron/daily-notices). execute=false 면 대상만 집계(점검 모드).
//  ① 자동취소 안내: 최근 자동취소(00:10 cron) 중 지금도 취소 상태인 건만. 취소 되돌림(재신청) 건은 상태가 바뀌어 제외.
//     #{취소일} = 실제 취소 처리일(auto_cancelled_at).
//  ② 행사 1주일 전 안내: 시작일이 오늘+7일인 차수의 입금확정 건(예비 제외). 공지 미지정·미게시면 보류.
// 모든 문자는 신청별 dedupe 로 1회만(재실행·동시 실행 안전).

export const REMINDER_DAYS = 7
// 자동취소 안내 대상 창 — 취소 cron(00:10) 이후 첫 10:00 실행이 잡도록 여유를 둔다. 하루 실행 누락 시 다음 날 보완.
export const CANCEL_NOTICE_WINDOW_MS = 36 * 3600 * 1000
const KST_MS = 9 * 3600 * 1000
const DAY_MS = 86400 * 1000

export interface DailyNoticesResult {
  ok: boolean
  mode: 'execute' | 'dry-run'
  targetDate: string // 1주일 전 안내 대상 시작일(YYYY-MM-DD, KST)
  cancelNotices: number
  sessions: { label: string; noticeLinked: boolean; applications: number }[]
  eventReminders: number
  error?: string
}

// KST 기준 오늘 + days 의 날짜(YYYY-MM-DD).
export function kstDatePlus(now: Date, days: number): string {
  const k = new Date(now.getTime() + KST_MS)
  return new Date(Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate() + days)).toISOString().slice(0, 10)
}

// 오늘(KST)부터 시작일까지 남은 날 수. 시작일이 오늘이면 0.
export function daysUntil(startsOn: string, now: Date): number {
  return Math.round((Date.parse(`${startsOn.slice(0, 10)}T00:00:00Z`) - Date.parse(`${kstDatePlus(now, 0)}T00:00:00Z`)) / DAY_MS)
}

// 차수별 공지 링크 — 연수 관리에서 지정한 공지(sessions.notice_id)가 게시 중일 때만. 그 외 null(문자 보류).
export async function noticeUrls(sessionIds: string[]): Promise<Map<string, string | null>> {
  const out = new Map<string, string | null>(sessionIds.map((id) => [id, null]))
  if (!sessionIds.length) return out
  const { data, error } = await supabaseAdmin.from('sessions').select('id, notice_id').in('id', sessionIds)
  if (error) {
    console.error('[daily-notices] notice_id:', error.code)
    return out
  }
  const rows = (data as { id: string; notice_id: string | null }[]) ?? []
  const noticeIds = [...new Set(rows.map((r) => r.notice_id).filter((v): v is string => !!v))]
  if (!noticeIds.length) return out
  const { data: ns, error: nErr } = await supabaseAdmin.from('notices').select('id').in('id', noticeIds).eq('is_published', true)
  if (nErr) {
    console.error('[daily-notices] notices:', nErr.code)
    return out
  }
  const published = new Set(((ns as { id: string }[]) ?? []).map((n) => n.id))
  for (const r of rows) {
    if (r.notice_id && published.has(r.notice_id)) out.set(r.id, `${siteBase()}/community/notices/${r.notice_id}`)
  }
  return out
}

// 늦은 입금확인 — 시작까지 7일 미만에 입금확인되면 그때 행사 안내(입금확인 문자와 별도). 행사 당일·시작 이후는 보내지 않는다.
// D-7 당일 10시 일괄 이후의 입금확인도 놓치지 않도록 7일째까지 포함 — 이미 받았으면 dedupe 로 생략.
export async function sendLateEventReminder(appId: string, now: Date = new Date()): Promise<void> {
  try {
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select('id, status, is_waitlisted, session_id, session:sessions(starts_on)')
      .eq('id', appId)
      .maybeSingle()
    if (error || !data) return
    const row = data as unknown as { status: string; is_waitlisted: boolean | null; session_id: string; session: { starts_on: string } | { starts_on: string }[] | null }
    const s = Array.isArray(row.session) ? row.session[0] : row.session
    if (!s || row.is_waitlisted || (row.status !== 'paid' && row.status !== 'completed')) return
    const d = daysUntil(s.starts_on, now)
    if (d < 1 || d > REMINDER_DAYS) return
    const url = (await noticeUrls([row.session_id])).get(row.session_id) ?? null
    await notifyEventReminder(appId, s.starts_on, url)
  } catch (e) {
    console.error('[daily-notices] late reminder:', e instanceof Error ? e.message : '')
  }
}

export async function runDailyNotices(opts: { execute: boolean; now?: Date }): Promise<DailyNoticesResult> {
  const now = opts.now ?? new Date()
  const targetDate = kstDatePlus(now, REMINDER_DAYS)
  const mode = opts.execute ? 'execute' : 'dry-run'
  const res: DailyNoticesResult = { ok: true, mode, targetDate, cancelNotices: 0, sessions: [], eventReminders: 0 }
  try {
    // ① 자동취소 안내
    const { data: cs, error: cErr } = await supabaseAdmin
      .from('applications')
      .select('id, auto_cancelled_at')
      .eq('status', 'cancelled')
      .gte('auto_cancelled_at', new Date(now.getTime() - CANCEL_NOTICE_WINDOW_MS).toISOString())
      .order('auto_cancelled_at', { ascending: true })
      .limit(500)
    if (cErr) throw cErr
    const cancelled = (cs as { id: string; auto_cancelled_at: string }[]) ?? []
    res.cancelNotices = cancelled.length

    // ② 행사 1주일 전 차수
    const { data: ss, error: sErr } = await supabaseAdmin.from('sessions').select('id, label, starts_on').eq('starts_on', targetDate)
    if (sErr) throw sErr
    const sessions = (ss as { id: string; label: string; starts_on: string }[]) ?? []
    let paid: { id: string; session_id: string }[] = []
    let urls = new Map<string, string | null>()
    if (sessions.length) {
      urls = await noticeUrls(sessions.map((s) => s.id))
      const { data: apps, error: aErr } = await supabaseAdmin
        .from('applications')
        .select('id, session_id')
        .in('session_id', sessions.map((s) => s.id))
        .in('status', ['paid', 'completed'])
        .eq('is_waitlisted', false)
        .order('created_at', { ascending: true })
        .limit(2000)
      if (aErr) throw aErr
      paid = (apps as typeof paid) ?? []
    }
    res.sessions = sessions.map((s) => ({
      label: s.label,
      noticeLinked: !!urls.get(s.id),
      applications: paid.filter((a) => a.session_id === s.id).length,
    }))
    res.eventReminders = paid.length
    if (!opts.execute) return res

    for (const c of cancelled) await notifyAutoCancelled(c.id, c.auto_cancelled_at)
    const byId = new Map(sessions.map((s) => [s.id, s]))
    for (const a of paid) {
      const s = byId.get(a.session_id)!
      await notifyEventReminder(a.id, s.starts_on, urls.get(s.id) ?? null)
    }
    return res
  } catch (e) {
    const code = (e as { code?: string })?.code ?? (e instanceof Error ? e.message : 'unknown')
    console.error('[daily-notices]', code)
    return { ...res, ok: false, error: code }
  }
}
