import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyMyToken } from '@/lib/serverCrypto'

// 마이페이지 신청건 액션 — 환불신청(refund) / 수정요청(modification).
// 토큰으로 본인확인 후, 대상 신청이 그 사람 소유(phone+name)인지 검증하고 insert.
// 비밀글 기본(is_secret) · 관리자 상태·답글은 어드민 연동 Phase에서 처리.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const base = { token: z.string().min(1), applicationId: z.string().uuid() }
// 수정요청 정형화 — 자유텍스트 대신 변경 항목 배열(current/requested). [[requests-reorg-modification-restructure]]
const changeSchema = z.object({
  target: z.enum(['participant', 'application']),
  participant_id: z.string().uuid().nullable(),
  participant_name: z.string().max(100),
  field: z.enum([
    'name', 'phone', 'birth_front', 'gender', 'lesson_level', 'equipment',
    'rental_apparel', 'rental_protector', 'rental_goggle', 'rental_glove',
  ]),
  label: z.string().max(40),
  current: z.string().max(200),
  requested: z.string().max(200),
})
const schema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('refund'), reason: z.string().trim().max(1000), refundAccount: z.string().trim().min(1).max(200) }),
  z.object({ ...base, type: z.literal('modification'), changes: z.array(changeSchema).min(1).max(30), userNote: z.string().trim().max(1000).optional() }),
  z.object({ ...base, type: z.literal('payment'), payerName: z.string().trim().min(1).max(100) }),
])

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })
  const body = parsed.data

  const claims = verifyMyToken(body.token, Date.now())
  if (!claims) return NextResponse.json({ error: '세션이 만료되었습니다. 다시 조회해 주세요.' }, { status: 401 })

  // 대상 신청이 토큰 주인의 것인지 확인(다른 사람 신청건 조작 방지).
  const { data: app, error: aErr } = await supabaseAdmin
    .from('applications')
    .select('id')
    .eq('id', body.applicationId)
    .eq('phone', claims.phone)
    .eq('applicant_name', claims.name)
    .maybeSingle()
  if (aErr) return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
  if (!app) return NextResponse.json({ error: '대상 신청 내역을 찾을 수 없습니다.' }, { status: 404 })

  if (body.type === 'refund') {
    const { error } = await supabaseAdmin.from('refund_requests').insert({
      application_id: body.applicationId,
      phone: claims.phone,
      reason: body.reason.trim() || null,
      refund_account: body.refundAccount.trim(),
    })
    if (error) {
      console.error('[my/requests] refund insert:', error)
      return NextResponse.json({ error: '환불 신청 저장 중 오류가 발생했습니다.' }, { status: 500 })
    }
  } else if (body.type === 'modification') {
    const { error } = await supabaseAdmin.from('modification_requests').insert({
      application_id: body.applicationId,
      phone: claims.phone,
      changes: body.changes,
      user_note: body.userNote?.trim() || null,
      is_secret: true,
    })
    if (error) {
      console.error('[my/requests] modification insert:', error)
      return NextResponse.json({ error: '수정 요청 저장 중 오류가 발생했습니다.' }, { status: 500 })
    }
  } else {
    // 입금 확인 요청 — status 는 안 바꾼다(관리자만 paid 전환). 입금대기 건에 신고 시각·입금자명만 기록.
    const { data: upd, error } = await supabaseAdmin
      .from('applications')
      .update({ payment_claimed_at: new Date().toISOString(), payment_claim_name: body.payerName.trim() })
      .eq('id', body.applicationId)
      .eq('status', 'pending')
      .is('payment_claimed_at', null) // 1회 정책 — 이미 신고된 건은 재요청 거부
      .select('id')
    if (error) {
      console.error('[my/requests] payment claim:', error)
      return NextResponse.json({ error: '입금 확인 요청 처리 중 오류가 발생했습니다.' }, { status: 500 })
    }
    if (!upd || upd.length === 0) {
      return NextResponse.json({ error: '이미 처리되었거나 요청할 수 없는 상태입니다.' }, { status: 409 })
    }
  }

  return NextResponse.json({ ok: true })
}
