import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyMyToken } from '@/lib/serverCrypto'
import { updateParticipantDetail } from '@/lib/participantDetail'

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
    'rental_apparel_size', 'rental_protector_size', 'rental_glove_size',
    'insurance',
  ]),
  label: z.string().max(40),
  current: z.string().max(200),
  requested: z.string().max(200),
})
const schema = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('refund'), reason: z.string().trim().max(1000), refundAccount: z.string().trim().min(1).max(200) }),
  z.object({
    ...base,
    type: z.literal('modification'),
    changes: z.array(changeSchema).min(1).max(30),
    userNote: z.string().trim().max(1000).optional(),
    // 보험 '희망' 전환 시에만 동봉. 평문은 여기서 소비하고 즉시 암호화 저장 — 요청 레코드에는 남기지 않는다.
    birthBack: z.string().regex(/^\d{7}$/).optional(),
    birthBackParticipantId: z.string().uuid().optional(),
  }),
  z.object({ ...base, type: z.literal('payment'), payerName: z.string().trim().min(1).max(100) }),
  z.object({ ...base, type: z.literal('due_payment') }), // 추가입금(수정 증액) 완료 신고 — 금액은 서버 due_amount 기준
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
    // 보험 '희망' 전환은 뒷자리 없이는 성립하지 않는다 — 이미 등록된 참가자가 아니면 서버에서 거절.
    // (클라이언트 검증만으로는 우회 가능 → 보험 미가입인데 가입으로 처리되는 사고 방지)
    const insChange = body.changes.find((c) => c.field === 'insurance' && c.requested === 'true')
    if (insChange?.participant_id) {
      const hasBirthBack = body.birthBack != null && body.birthBackParticipantId === insChange.participant_id
      if (!hasBirthBack) {
        const { data: p } = await supabaseAdmin
          .from('participants')
          .select('birth_back_enc')
          .eq('id', insChange.participant_id)
          .eq('application_id', body.applicationId)
          .maybeSingle()
        if (!p?.birth_back_enc) {
          return NextResponse.json(
            { error: '보험 가입을 위해 주민번호 뒷자리 7자리를 입력해 주세요.' },
            { status: 400 },
          )
        }
      }
    }

    // 보험 뒷자리 — 신청폼과 동일하게 write-only 암호문으로만 적재(participants.birth_back_enc).
    // changes(jsonb)는 어드민 화면에 그대로 노출되므로 뒷자리는 절대 넣지 않는다.
    // 승인 전 선반영이지만 대상은 복호 불가한 암호문 1개뿐 — 요금·명부 필드는 어드민 반영 시에만 바뀐다.
    if (body.birthBack && body.birthBackParticipantId) {
      const { data: part, error: pErr } = await supabaseAdmin
        .from('participants')
        .select('id')
        .eq('id', body.birthBackParticipantId)
        .eq('application_id', body.applicationId)
        .maybeSingle()
      if (pErr) return NextResponse.json({ error: '처리 중 오류가 발생했습니다.' }, { status: 500 })
      if (!part) return NextResponse.json({ error: '대상 참가자를 찾을 수 없습니다.' }, { status: 404 })
      const res = await updateParticipantDetail(body.birthBackParticipantId, { birthBack: body.birthBack })
      if (!res.ok) return NextResponse.json({ error: res.error }, { status: 400 })
    }
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
  } else if (body.type === 'due_payment') {
    // 추가입금 완료 신고 — 최초 입금과 별개(due_claimed_at). due_amount>0(추가입금 대기) 건에만, 1회.
    // status·total 은 안 바꾼다(어드민 confirmDuePayment 가 due_amount=0 + due_claimed_at=null 로 소비).
    const { data: upd, error } = await supabaseAdmin
      .from('applications')
      .update({ due_claimed_at: new Date().toISOString() })
      .eq('id', body.applicationId)
      .gt('due_amount', 0)
      .is('due_claimed_at', null)
      .select('id')
    if (error) {
      console.error('[my/requests] due claim:', error)
      return NextResponse.json({ error: '추가입금 확인 요청 처리 중 오류가 발생했습니다.' }, { status: 500 })
    }
    if (!upd || upd.length === 0) {
      return NextResponse.json({ error: '이미 처리되었거나 요청할 수 없는 상태입니다.' }, { status: 409 })
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
