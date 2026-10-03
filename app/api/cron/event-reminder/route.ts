import 'server-only'
import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { runEventReminder } from '@/lib/eventReminder'

// 차수 1주일 전 안내 문자 — Vercel Cron(vercel.json) 하루 1회 호출.
// 인증: Authorization: Bearer ${CRON_SECRET}. 미설정이면 실행 거부.
// 실제 발송 처리는 EVENT_REMINDER_ENABLED=true 일 때만. 그 외(또는 ?dryRun=1)는 대상만 집계해 반환·로그.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function authorized(header: string | null, secret: string): boolean {
  const a = Buffer.from(header ?? '')
  const b = Buffer.from(`Bearer ${secret}`)
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET?.trim()
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET 미설정' }, { status: 503 })
  if (!authorized(req.headers.get('authorization'), secret)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const dryRun = new URL(req.url).searchParams.get('dryRun') === '1'
  const execute = process.env.EVENT_REMINDER_ENABLED?.trim().toLowerCase() === 'true' && !dryRun
  const result = await runEventReminder({ execute })
  console.log(`[event-reminder] ${result.mode} target=${result.targetDate} sessions=${result.sessions.length} dispatched=${result.dispatched}${result.error ? ` error=${result.error}` : ''}`)
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
