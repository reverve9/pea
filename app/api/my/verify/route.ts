import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { issueMyToken } from '@/lib/serverCrypto'

// 마이페이지 본인확인 — 이름 + 전화번호 + 생년월일(대표 birth_front) 매칭. SMS/OTP 없음.
// 매칭 성공 = 조회 권한 → opaque HMAC 토큰 발급(phone+name). 원문 생년월일은 토큰에 넣지 않는다.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  name: z.string().trim().min(1),
  phone: z.string().regex(/^\d{10,11}$/),
  birth: z.string().regex(/^\d{6}$/),
})

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })
  const { name, phone, birth } = parsed.data

  // phone + applicant_name 으로 후보를 좁히고, 대표 참가자 birth_front 로 최종 확인.
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('id, participants(birth_front, is_leader)')
    .eq('phone', phone)
    .eq('applicant_name', name)
  if (error) {
    console.error('[my/verify]', error)
    return NextResponse.json({ error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }

  type Row = { id: string; participants: { birth_front: string | null; is_leader: boolean }[] | null }
  const matched = ((data as Row[]) ?? []).some((row) =>
    (row.participants ?? []).some((p) => p.is_leader && p.birth_front === birth),
  )
  if (!matched) {
    return NextResponse.json({ error: '일치하는 신청 내역이 없습니다. 입력 정보를 확인해 주세요.' }, { status: 404 })
  }

  const token = issueMyToken(phone, name, Date.now())
  return NextResponse.json({ token, name })
}
