import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyMyToken, issueFillToken } from '@/lib/serverCrypto'

// 셀프필 링크 발급(마이페이지) — 대표가 동반인에게 공유할 링크 토큰 생성.
// 마이 세션 검증 + 신청 소유권 확인 후 fill 토큰 발급. 전체 URL 은 클라가 origin 붙여 조립.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  token: z.string().min(1),
  applicationId: z.string().uuid(),
  participantId: z.string().uuid(), // 링크가 가리킬 단일 참가자(각자 본인 것만 수정)
})

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })

  const claims = verifyMyToken(parsed.data.token, Date.now())
  if (!claims) return NextResponse.json({ error: '세션이 만료되었습니다. 다시 조회해 주세요.' }, { status: 401 })

  // 대표 본인 신청인지 확인
  const { data: app, error } = await supabaseAdmin
    .from('applications')
    .select('id')
    .eq('id', parsed.data.applicationId)
    .eq('phone', claims.phone)
    .eq('applicant_name', claims.name)
    .maybeSingle()
  if (error) return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  if (!app) return NextResponse.json({ error: '대상 신청 내역을 찾을 수 없습니다.' }, { status: 404 })

  // 참가자가 그 신청 소속인지 확인 후, 그 참가자 전용 링크 발급
  const { data: part, error: pErr } = await supabaseAdmin
    .from('participants')
    .select('id')
    .eq('id', parsed.data.participantId)
    .eq('application_id', parsed.data.applicationId)
    .maybeSingle()
  if (pErr) return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  if (!part) return NextResponse.json({ error: '대상 참가자를 찾을 수 없습니다.' }, { status: 404 })

  const fillToken = issueFillToken(parsed.data.applicationId, parsed.data.participantId, Date.now())
  return NextResponse.json({ fillToken })
}
