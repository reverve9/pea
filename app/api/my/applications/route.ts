import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyMyToken } from '@/lib/serverCrypto'
import { formatPeriod, SCHEDULE_TYPE } from '@/lib/display'
import type { ScheduleType, ModificationChange } from '@/lib/types'
import type { MyApplicationRow, MyModificationRow, MyRefundRow } from '@/lib/applicationTypes'

// 마이페이지 신청목록 — verify 에서 발급한 토큰 검증 후 phone+name 기준 조회(service_role, RLS 우회).
// applications 엔 anon SELECT 정책이 없다(OTP 폐기 → 토큰 게이트가 유일 경로).
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({ token: z.string().min(1) })

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })

  const claims = verifyMyToken(parsed.data.token, Date.now())
  if (!claims) return NextResponse.json({ error: '세션이 만료되었습니다. 다시 조회해 주세요.' }, { status: 401 })

  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('id, application_no, applicant_name, payer_name, total_amount, due_amount, due_claimed_at, status, payment_claimed_at, created_at, session:sessions(schedule_type, starts_on, ends_on, nights), participants(id), modification_requests(status, changes, admin_reply, created_at), refund_requests(status, origin, amount, created_at)')
    .eq('phone', claims.phone)
    .eq('applicant_name', claims.name)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[my/applications]', error)
    return NextResponse.json({ error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }

  type ModRow = { status: MyModificationRow['status']; changes: ModificationChange[] | null; admin_reply: string | null; created_at: string }
  type RefundRow = { status: MyRefundRow['status']; origin: MyRefundRow['origin']; amount: number | null; created_at: string }
  type Row = {
    id: string
    application_no: string
    applicant_name: string
    payer_name: string | null
    total_amount: number
    due_amount: number | null
    due_claimed_at: string | null
    status: MyApplicationRow['status']
    payment_claimed_at: string | null
    created_at: string
    session: { schedule_type: ScheduleType; starts_on: string; ends_on: string; nights: number } | null
    participants: { id: string }[] | null
    modification_requests: ModRow[] | null
    refund_requests: RefundRow[] | null
  }

  // 변경 항목 라벨 요약(중복 제거) — 고객 노출용 짧은 설명.
  const summarize = (changes: ModificationChange[] | null): string => {
    const labels = Array.from(new Set((Array.isArray(changes) ? changes : []).map((c) => c.label)))
    return labels.join(' · ') || '정보 수정'
  }
  const byNewest = <T extends { created_at: string }>(a: T, b: T) => (a.created_at < b.created_at ? 1 : -1)

  const rows: MyApplicationRow[] = ((data as unknown as Row[]) ?? []).map((r) => {
    const st = r.session?.schedule_type ?? 'jikmu'
    const isJikmu = st === 'jikmu'
    const modifications: MyModificationRow[] = (r.modification_requests ?? [])
      .map((m) => ({ status: m.status, changes_summary: summarize(m.changes), admin_reply: m.admin_reply, created_at: m.created_at }))
      .sort(byNewest)
    const refunds: MyRefundRow[] = (r.refund_requests ?? [])
      .map((f) => ({ status: f.status, origin: f.origin, amount: f.amount, created_at: f.created_at }))
      .sort(byNewest)
    return {
      id: r.id,
      application_no: r.application_no,
      kind: isJikmu ? 'jikmu' : 'jayul',
      track_label: isJikmu ? '직무연수' : `자율패키지 · ${SCHEDULE_TYPE[st].label}`,
      period: r.session ? formatPeriod(r.session.starts_on, r.session.ends_on, r.session.nights) : '',
      starts_on: r.session?.starts_on ?? '',
      applicant_name: r.applicant_name,
      payer_name: r.payer_name,
      headcount: r.participants?.length ?? 1,
      total_amount: r.total_amount,
      due_amount: r.due_amount ?? 0,
      due_claimed: r.due_claimed_at != null,
      status: r.status,
      payment_claimed: r.payment_claimed_at != null,
      created_at: r.created_at.slice(0, 10).replaceAll('-', '/'),
      modifications,
      refunds,
    }
  })

  return NextResponse.json({ applications: rows })
}
