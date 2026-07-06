import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { verifyFillToken } from '@/lib/serverCrypto'
import { getRosterParticipant, getRosterSummary } from '@/lib/participantRoster'

// 셀프필 공개 로스터 — 링크 토큰만으로 조회(마이 세션 불필요). 토큰이 크리덴셜.
// 개별 링크 = 토큰의 참가자(pid) 본인 1명만 반환(타인 정보 미노출). 뒷자리 미포함(has_insurance 플래그만).
// 요약은 최소 식별 정보(연수유형·일정·대표명)만.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({ token: z.string().min(1) })

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })

  const claims = verifyFillToken(parsed.data.token, Date.now())
  if (!claims) return NextResponse.json({ error: '유효하지 않거나 만료된 링크입니다.' }, { status: 401 })

  try {
    const [part, summary] = await Promise.all([
      getRosterParticipant(claims.aid, claims.pid),
      getRosterSummary(claims.aid),
    ])
    if (!summary || !part) return NextResponse.json({ error: '신청 내역을 찾을 수 없습니다.' }, { status: 404 })
    return NextResponse.json({ roster: [part], summary })
  } catch (e) {
    console.error('[fill/roster]', e)
    return NextResponse.json({ error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
