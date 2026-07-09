import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyMyToken } from '@/lib/serverCrypto'
import { extractRentalQty } from '@/lib/pricing'
import { RENTAL_OPTIONS } from '@/lib/rentalOptions'
import { isDetailFillClosed } from '@/lib/fillDeadline'

// 대표 렌탈 배정 — 자율패키지에서 구매한 렌탈 수량을 참가자별로 귀속(옵션 여부 + 보험).
// 정합성: 옵션별 배정 합계는 구매 수량을 초과할 수 없다(초과 시 저장 차단). 사이즈는 참가자가 별도 입력.
// 옵션 여부·보험은 대표가 결정(잠금), 참가자는 사이즈·본인정보만 수정 → 배정은 이 엔드포인트로만.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({
  token: z.string().min(1),
  applicationId: z.string().uuid(),
  assignments: z
    .array(
      z.object({
        participantId: z.string().uuid(),
        apparel: z.boolean(),
        protector: z.boolean(),
        goggle: z.boolean(),
        glove: z.boolean(),
        insuranceWanted: z.boolean(),
      }),
    )
    .min(1),
})

const OPT_LABEL: Record<'apparel' | 'protector' | 'goggle' | 'glove', string> = {
  apparel: '의류',
  protector: '보호대',
  goggle: '고글',
  glove: '장갑',
}

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })
  const b = parsed.data

  const claims = verifyMyToken(b.token, Date.now())
  if (!claims) return NextResponse.json({ error: '세션이 만료되었습니다. 다시 조회해 주세요.' }, { status: 401 })

  // 소유권 확인 + 구매 수량 로드.
  const { data: app, error: aErr } = await supabaseAdmin
    .from('applications')
    .select('id, price_breakdown, session:sessions(starts_on)')
    .eq('id', b.applicationId)
    .eq('phone', claims.phone)
    .eq('applicant_name', claims.name)
    .maybeSingle()
  if (aErr) return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  if (!app) return NextResponse.json({ error: '대상 신청 내역을 찾을 수 없습니다.' }, { status: 404 })

  // 입력 마감(연수 시작 − 10일) 이후엔 배정 잠금 → 수정요청으로.
  const sessRaw = (app as { session?: unknown }).session
  const sess = Array.isArray(sessRaw) ? sessRaw[0] : sessRaw
  const startsOn = (sess as { starts_on?: string } | null)?.starts_on
  if (startsOn && isDetailFillClosed(startsOn)) {
    return NextResponse.json(
      { error: '참가자 정보 입력 마감(연수 시작 10일 전)이 지났습니다. 변경은 수정요청을 이용해 주세요.' },
      { status: 409 },
    )
  }

  const qty = extractRentalQty(app.price_breakdown as { meta?: Record<string, unknown> } | null)

  // 정합성 — 옵션별 배정 합계 ≤ 구매 수량.
  const counts = { apparel: 0, protector: 0, goggle: 0, glove: 0 }
  for (const a of b.assignments) {
    if (a.apparel) counts.apparel++
    if (a.protector) counts.protector++
    if (a.goggle) counts.goggle++
    if (a.glove) counts.glove++
  }
  for (const key of ['apparel', 'protector', 'goggle', 'glove'] as const) {
    if (counts[key] > qty[key]) {
      return NextResponse.json(
        { error: `${OPT_LABEL[key]} 배정(${counts[key]})이 구매 수량(${qty[key]})을 초과했습니다.` },
        { status: 400 },
      )
    }
  }

  // 대상 참가자가 전부 이 신청 소속인지 확인 + 현재 rentals 로드(사이즈·용품세트 보존 병합용).
  const ids = b.assignments.map((a) => a.participantId)
  const { data: parts, error: pErr } = await supabaseAdmin
    .from('participants')
    .select('id, rentals')
    .eq('application_id', b.applicationId)
    .in('id', ids)
  if (pErr) return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  if (!parts || parts.length !== ids.length) {
    return NextResponse.json({ error: '대상 참가자를 찾을 수 없습니다.' }, { status: 404 })
  }
  const curById = new Map(parts.map((p) => [p.id as string, (p.rentals as Record<string, unknown> | null) ?? {}]))

  // 참가자별 rentals 병합 갱신 — 옵션 플래그·보험 설정, 해제된 옵션의 사이즈는 제거(잔존 방지).
  for (const a of b.assignments) {
    const cur = { ...curById.get(a.participantId) }
    cur.apparel = a.apparel
    cur.protector = a.protector
    cur.goggle = a.goggle
    cur.glove = a.glove
    cur.insurance_wanted = a.insuranceWanted
    for (const opt of RENTAL_OPTIONS) {
      if (opt.rentalSizeKey && a[opt.key] === false) cur[opt.rentalSizeKey] = null
    }
    const { error: uErr } = await supabaseAdmin.from('participants').update({ rentals: cur }).eq('id', a.participantId)
    if (uErr) {
      console.error('[my/assign] update:', uErr)
      return NextResponse.json({ error: '배정 저장 중 오류가 발생했습니다.' }, { status: 500 })
    }
  }

  return NextResponse.json({ ok: true })
}
