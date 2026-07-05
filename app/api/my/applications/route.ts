import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyMyToken } from '@/lib/serverCrypto'
import { formatPeriod, SCHEDULE_TYPE } from '@/lib/display'
import type { ScheduleType } from '@/lib/types'
import type { MyApplicationRow } from '@/lib/applicationTypes'

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
    .select('id, application_no, applicant_name, total_amount, status, created_at, session:sessions(schedule_type, starts_on, ends_on, nights), participants(id)')
    .eq('phone', claims.phone)
    .eq('applicant_name', claims.name)
    .order('created_at', { ascending: false })
  if (error) {
    console.error('[my/applications]', error)
    return NextResponse.json({ error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }

  type Row = {
    id: string
    application_no: string
    applicant_name: string
    total_amount: number
    status: MyApplicationRow['status']
    created_at: string
    session: { schedule_type: ScheduleType; starts_on: string; ends_on: string; nights: number } | null
    participants: { id: string }[] | null
  }

  const rows: MyApplicationRow[] = ((data as unknown as Row[]) ?? []).map((r) => {
    const st = r.session?.schedule_type ?? 'jikmu'
    const isJikmu = st === 'jikmu'
    return {
      id: r.id,
      application_no: r.application_no,
      kind: isJikmu ? 'jikmu' : 'jayul',
      track_label: isJikmu ? '직무연수' : `자율패키지 · ${SCHEDULE_TYPE[st].label}`,
      period: r.session ? formatPeriod(r.session.starts_on, r.session.ends_on, r.session.nights) : '',
      applicant_name: r.applicant_name,
      headcount: r.participants?.length ?? 1,
      total_amount: r.total_amount,
      status: r.status,
      created_at: r.created_at.slice(0, 10).replaceAll('-', '.'),
    }
  })

  return NextResponse.json({ applications: rows })
}
