import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyFillToken } from '@/lib/serverCrypto'
import { updateParticipantDetail } from '@/lib/participantDetail'

// 셀프필 저장 — 동반인이 링크로 접속해 본인 정보 입력. 마이 대표입력(/api/my/participant)과 동일 갱신 로직.
// 링크 토큰 → applicationId, 참가자가 그 신청 소속인지 검증 후 participantDetail 갱신. 뒷자리 write-only.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  token: z.string().min(1),
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

  const claims = verifyFillToken(b.token, Date.now())
  if (!claims) return NextResponse.json({ error: '유효하지 않거나 만료된 링크입니다.' }, { status: 401 })

  // 참가자가 링크의 신청(aid) 소속인지 확인(다른 신청 참가자 조작 방지).
  const { data: part, error: pErr } = await supabaseAdmin
    .from('participants')
    .select('id')
    .eq('id', b.participantId)
    .eq('application_id', claims.aid)
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
