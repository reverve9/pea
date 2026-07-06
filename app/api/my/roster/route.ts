import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyMyToken } from '@/lib/serverCrypto'
import { getRoster } from '@/lib/participantRoster'
import { extractRentalQty } from '@/lib/pricing'

// 마이페이지 참가자 로스터 — 대표가 동반인 후속정보를 대신 입력하기 위한 조회.
// 토큰 검증 후 대상 신청이 토큰 주인(phone+name)의 것인지 확인하고 안전 필드만 반환. 뒷자리는 절대 싣지 않는다.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({ token: z.string().min(1), applicationId: z.string().uuid() })

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })

  const claims = verifyMyToken(parsed.data.token, Date.now())
  if (!claims) return NextResponse.json({ error: '세션이 만료되었습니다. 다시 조회해 주세요.' }, { status: 401 })

  // 소유권 확인 — 대상 신청이 토큰 주인의 것인지.
  const { data: app, error: aErr } = await supabaseAdmin
    .from('applications')
    .select('id, price_breakdown')
    .eq('id', parsed.data.applicationId)
    .eq('phone', claims.phone)
    .eq('applicant_name', claims.name)
    .maybeSingle()
  if (aErr) return NextResponse.json({ error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  if (!app) return NextResponse.json({ error: '대상 신청 내역을 찾을 수 없습니다.' }, { status: 404 })

  try {
    const roster = await getRoster(parsed.data.applicationId)
    const rentalQty = extractRentalQty(app.price_breakdown as { meta?: Record<string, unknown> } | null)
    return NextResponse.json({ roster, rentalQty })
  } catch (e) {
    console.error('[my/roster]', e)
    return NextResponse.json({ error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
