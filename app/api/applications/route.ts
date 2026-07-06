import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { encryptSecret } from '@/lib/serverCrypto'
import { computeJikmu, computeJayul } from '@/lib/pricing'
import { applicationPrefix } from '@/lib/programs'
import type { PriceItem } from '@/lib/types'
import type { JikmuPayload, JayulPayload } from '@/lib/applicationTypes'

// 신청 제출 파이프라인 — service_role(RLS 우회). 클라 폼(직무·자율) → 여기로 POST.
// 책임: 검증 → 가격 서버 재계산(조작 방지) → 발번 → 뒷자리 암호화 → applications+participants insert.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const phone = z.string().regex(/^\d{10,11}$/, '연락처 형식 오류')
const optPhone = z.string().regex(/^\d{10,11}$/).or(z.literal(''))
const birth6 = z.string().regex(/^\d{6}$/, '생년월일 6자리')

const applicant = z.object({
  name: z.string().trim().min(1),
  gender: z.enum(['male', 'female']).or(z.literal('')),
  phone,
  birthFront: birth6,
  schoolName: z.string().trim().min(1),
  region: z.string().trim().min(1),
})

const jikmuSchema = z.object({
  kind: z.literal('jikmu'),
  sessionId: z.string().uuid(),
  applicant,
  insurance: z.boolean(),
  birthBack: z.string().regex(/^\d{7}$/).or(z.literal('')),
  lessonSport: z.enum(['ski', 'board']).or(z.literal('')),
  lessonClass: z.string(),
  roomType: z.enum(['group', 'private']),
  roomSpec: z.string(),
  rentals: z.object({ apparel: z.boolean(), goggle: z.boolean(), protector: z.boolean(), glove: z.boolean() }),
  apparelSize: z.string(),
  protectorSize: z.string(),
  gloveSize: z.string(),
  hasCompanion: z.boolean(),
  companion: z.string(),
  companionPhone: z.string(),
  notes: z.string(),
  payerDiffers: z.boolean(),
  payerName: z.string(),
  routes: z.array(z.string()),
  privacyConsent: z.literal(true), // 필수 동의 없이는 접수 불가
  marketingOptIn: z.boolean(),
})

const jayulSchema = z.object({
  kind: z.literal('jayul'),
  sessionId: z.string().uuid(),
  variant: z.enum(['weekday_2n', 'weekend_2n', 'weekend_1n']),
  headcount: z.number().int().min(1).max(6),
  applicant,
  lessonClass: z.string(),
  equipment: z.enum(['ski', 'board']).or(z.literal('')),
  rentals: z.object({ apparel: z.number().int().min(0), goggle: z.number().int().min(0), protector: z.number().int().min(0), glove: z.number().int().min(0) }),
  repInsurance: z.boolean(),
  note: z.string(),
  payerDiffers: z.boolean(),
  payerName: z.string(),
  routes: z.array(z.string()),
  privacyConsent: z.literal(true),
  marketingOptIn: z.boolean(),
})

const bodySchema = z.discriminatedUnion('kind', [jikmuSchema, jayulSchema])

function fail(msg: string, status = 400) {
  return NextResponse.json({ error: msg }, { status })
}

export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return fail('입력값이 올바르지 않습니다.')
  const payload = parsed.data

  // 1) 세션 확인 — 존재·유형 일치 + 발번 연도(연수 시작연도) + 종목(course.sport, 발번 접두어용).
  const { data: session, error: sErr } = await supabaseAdmin
    .from('sessions')
    .select('id, schedule_type, starts_on, course:courses(sport)')
    .eq('id', payload.sessionId)
    .maybeSingle()
  if (sErr) return fail('일정 조회 중 오류가 발생했습니다.', 500)
  if (!session) return fail('선택한 일정을 찾을 수 없습니다.')
  const expectType = payload.kind === 'jikmu' ? 'jikmu' : payload.variant
  if (session.schedule_type !== expectType) return fail('선택한 유형과 일정이 일치하지 않습니다.')
  const courseRaw = (session as { course: unknown }).course
  const sport = ((Array.isArray(courseRaw) ? courseRaw[0] : courseRaw) as { sport: string } | null)?.sport ?? null

  // 2) 단가 로드 + 가격 서버 재계산(권위).
  const { data: priceRows, error: pErr } = await supabaseAdmin
    .from('price_items')
    .select('id, category, item_key, label, amount, sort_order')
    .eq('is_active', true)
  if (pErr) return fail('가격 조회 중 오류가 발생했습니다.', 500)
  const items = (priceRows as PriceItem[]) ?? []
  const breakdown = payload.kind === 'jikmu'
    ? computeJikmu(payload as JikmuPayload, items)
    : computeJayul(payload as JayulPayload, items)
  if (breakdown.total <= 0) return fail('금액을 계산할 수 없습니다. 선택을 확인해 주세요.')

  // 3) 발번(원자적 RPC) — {종목}{유형}-{YY}-{5자리}. 접두어 = 종목코드 + 유형코드(CT/FP).
  const year = Number(session.starts_on.slice(0, 4))
  const prefix = applicationPrefix(sport, payload.kind)
  const { data: appNo, error: nErr } = await supabaseAdmin.rpc('next_application_no', {
    p_prefix: prefix,
    p_year: year,
  })
  if (nErr || typeof appNo !== 'string') return fail('신청번호 발급 중 오류가 발생했습니다.', 500)

  // 4) applications insert.
  const now = new Date().toISOString()
  const isJikmu = payload.kind === 'jikmu'
  const appRow = {
    application_no: appNo,
    session_id: payload.sessionId,
    phone: payload.applicant.phone,
    applicant_name: payload.applicant.name.trim(),
    payer_name: payload.payerDiffers && payload.payerName.trim() ? payload.payerName.trim() : null,
    room_type: isJikmu ? (payload as JikmuPayload).roomType : null,
    room_spec: isJikmu && (payload as JikmuPayload).roomType === 'private' ? (payload as JikmuPayload).roomSpec || null : null,
    pkg_size: isJikmu ? null : (payload as JayulPayload).headcount,
    total_amount: breakdown.total,
    price_breakdown: breakdown,
    status: 'pending' as const,
    companion_memo: isJikmu && (payload as JikmuPayload).hasCompanion
      ? `${(payload as JikmuPayload).companion} / ${(payload as JikmuPayload).companionPhone}`.trim()
      : null,
    special_notes: (isJikmu ? (payload as JikmuPayload).notes : (payload as JayulPayload).note).trim() || null,
    referral_source: payload.routes,
    privacy_agreed: true,
    privacy_agreed_at: now,
    marketing_opt_in: payload.marketingOptIn,
  }
  const { data: appIns, error: aErr } = await supabaseAdmin
    .from('applications')
    .insert(appRow)
    .select('id')
    .single()
  if (aErr || !appIns) {
    console.error('[applications] insert app:', aErr)
    return fail('신청 저장 중 오류가 발생했습니다.', 500)
  }
  const appId = appIns.id as string

  // 5) participants insert. 실패 시 방금 만든 application 롤백(best-effort).
  let participants: Record<string, unknown>[]
  try {
    participants = buildParticipants(payload, appId, breakdown.total)
  } catch (e) {
    console.error('[applications] encrypt:', e)
    await supabaseAdmin.from('applications').delete().eq('id', appId)
    return fail('보험 정보 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.', 500)
  }
  const { error: partErr } = await supabaseAdmin.from('participants').insert(participants)
  if (partErr) {
    console.error('[applications] insert participants:', partErr)
    await supabaseAdmin.from('applications').delete().eq('id', appId)
    return fail('참가자 정보 저장 중 오류가 발생했습니다.', 500)
  }

  return NextResponse.json({ application_no: appNo })
}

// 참가자 행 구성 — 직무=대표 1명, 자율=대표 + 참가자 빈 슬롯(상세는 신청 후 채움).
function buildParticipants(payload: JikmuPayload | JayulPayload, appId: string, total: number): Record<string, unknown>[] {
  const a = payload.applicant
  if (payload.kind === 'jikmu') {
    return [{
      application_id: appId,
      name: a.name.trim(),
      gender: a.gender || null,
      phone: a.phone,
      lesson_level: payload.lessonClass || null,
      rentals: {
        apparel: payload.rentals.apparel,
        apparel_size: payload.rentals.apparel ? payload.apparelSize || null : null,
        goggle: payload.rentals.goggle,
        protector: payload.rentals.protector,
        protector_size: payload.rentals.protector ? payload.protectorSize || null : null,
        glove: payload.rentals.glove,
        glove_size: payload.rentals.glove ? payload.gloveSize || null : null,
      },
      birth_front: a.birthFront,
      birth_back_enc: payload.insurance && payload.birthBack ? encryptSecret(payload.birthBack) : null,
      is_leader: true,
      sort_order: 0,
      line_amount: total,
    }]
  }
  const leader = {
    application_id: appId,
    name: a.name.trim(),
    gender: a.gender || null,
    phone: a.phone,
    lesson_level: payload.lessonClass || null,
    rentals: { insurance_wanted: payload.repInsurance, equipment: payload.equipment || null },
    birth_front: a.birthFront,
    birth_back_enc: null,
    is_leader: true,
    sort_order: 0,
    line_amount: total,
  }
  // 참가자(대표 외) = 인원수만큼 빈 슬롯(placeholder). 상세는 신청 후 마이페이지/셀프필로 채운다.
  const companionCount = Math.max(0, payload.headcount - 1)
  const companions = Array.from({ length: companionCount }, (_, i) => ({
    application_id: appId,
    name: `참가자 ${i + 2}`,
    gender: null,
    phone: null,
    lesson_level: null,
    rentals: {},
    birth_front: null,
    birth_back_enc: null,
    is_leader: false,
    sort_order: i + 1,
    line_amount: 0,
  }))
  return [leader, ...companions]
}
