import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyMyToken } from '@/lib/serverCrypto'
import { updateParticipantDetail } from '@/lib/participantDetail'

// 마이페이지 참가자 후속입력 — 대표가 동반인 정보를 대신 입력. 셀프필(/api/fill)과 동일 갱신 로직 공유.
// 토큰 → 신청 소유권(phone+name) → 참가자가 그 신청 소속인지 3중 검증 후 participantDetail 갱신.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  token: z.string().min(1),
  applicationId: z.string().uuid(),
  participantId: z.string().uuid(),
  name: z.string().optional(),
  phone: z.string().optional(),
  birthFront: z.string().optional(),
  gender: z.string().optional(),
  birthBack: z.string().optional(),
  lessonClass: z.string().optional(),
  equipment: z.string().optional(),
  apparelSize: z.string().optional(),
})

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })
  const b = parsed.data

  const claims = verifyMyToken(b.token, Date.now())
  if (!claims) return NextResponse.json({ error: '세션이 만료되었습니다. 다시 조회해 주세요.' }, { status: 401 })

  // 소유권 확인 — 대상 신청이 토큰 주인의 것인지.
  const { data: app, error: aErr } = await supabaseAdmin
    .from('applications')
    .select('id')
    .eq('id', b.applicationId)
    .eq('phone', claims.phone)
    .eq('applicant_name', claims.name)
    .maybeSingle()
  if (aErr) return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  if (!app) return NextResponse.json({ error: '대상 신청 내역을 찾을 수 없습니다.' }, { status: 404 })

  // 참가자가 그 신청 소속인지 확인(다른 신청의 참가자 조작 방지).
  const { data: part, error: pErr } = await supabaseAdmin
    .from('participants')
    .select('id')
    .eq('id', b.participantId)
    .eq('application_id', b.applicationId)
    .maybeSingle()
  if (pErr) return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  if (!part) return NextResponse.json({ error: '대상 참가자를 찾을 수 없습니다.' }, { status: 404 })

  const res = await updateParticipantDetail(b.participantId, {
    name: b.name,
    phone: b.phone,
    birthFront: b.birthFront,
    gender: b.gender,
    birthBack: b.birthBack,
    lessonClass: b.lessonClass,
    equipment: b.equipment,
    apparelSize: b.apparelSize,
  })
  if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })

  return NextResponse.json({ ok: true })
}
