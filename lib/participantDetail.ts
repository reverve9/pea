import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'
import { encryptSecret } from './serverCrypto'

// 참가자 상세(성함·연락처·생년월일·성별·뒷자리·기초강습·대여장비·의류사이즈) 갱신 — 신청 완료 후 채우는 값.
// 어드민 수기 입력과 동반인 셀프필(토큰) 두 경로가 공유하는 단일 갱신 로직. 뒷자리는 서버에서 암호화 저장.
// undefined = 미변경(해당 필드 건드리지 않음), 빈문자 = 무시(기존 값 유지). 실수로 값이 지워지지 않게 보수적.

export interface ParticipantDetailInput {
  name?: string // 성함. 빈값 → 미변경
  phone?: string // 연락처. 빈값 → 미변경
  birthFront?: string // YYMMDD 6자리
  gender?: string // 'male' | 'female' | '' (그 외/빈값 → 미변경)
  birthBack?: string // 주민번호 뒷자리 7자리(보험용). 빈값 → 미변경
  lessonClass?: string // lesson_level key(직무 반 or 자율 jayul_*). 빈값 → 미변경
  equipment?: string // 'ski' | 'board' | '' → rentals.equipment (merge). 그 외/빈값 → 미변경
  apparelSize?: string // rentals.apparel_size (merge). 빈값 → 미변경
  protectorSize?: string // rentals.protector_size (merge). 빈값 → 미변경
  gloveSize?: string // rentals.glove_size (merge). 빈값 → 미변경
  // 렌탈 옵션 귀속·보험 — 대표 배정(/api/my/assign)·어드민 보정 전용. 참가자 셀프필 라우트는 넘기지 않아 잠금 유지.
  // boolean 명시 시에만 반영(undefined = 미변경). false 로 끄면 해당 사이즈도 제거.
  apparel?: boolean
  protector?: boolean
  goggle?: boolean
  glove?: boolean
  insuranceWanted?: boolean
}
export type ParticipantUpdateResult = { ok: true } | { ok: false; error: string }

export async function updateParticipantDetail(
  participantId: string,
  input: ParticipantDetailInput,
): Promise<ParticipantUpdateResult> {
  const patch: Record<string, unknown> = {}

  if (input.name != null) {
    const n = input.name.trim()
    if (n) patch.name = n
  }
  if (input.phone != null) {
    const p = input.phone.trim()
    if (p) patch.phone = p
  }
  if (input.birthFront != null) {
    const bf = input.birthFront.replace(/\D/g, '')
    if (bf) {
      if (bf.length !== 6) return { ok: false, error: '생년월일 6자리(YYMMDD)를 입력해 주세요.' }
      patch.birth_front = bf
    }
  }
  if (input.gender === 'male' || input.gender === 'female') {
    patch.gender = input.gender
  }
  if (input.birthBack != null) {
    const bb = input.birthBack.replace(/\D/g, '')
    if (bb) {
      if (bb.length !== 7) return { ok: false, error: '주민번호 뒷자리 7자리를 입력해 주세요.' }
      patch.birth_back_enc = encryptSecret(bb)
    }
  }
  if (input.lessonClass != null) {
    const lc = input.lessonClass.trim()
    if (lc) patch.lesson_level = lc
  }

  // rentals(jsonb)는 반드시 병합 — insurance_wanted 등 기존 값을 덮어쓰지 않게 현재 값 fetch 후 spread.
  const rentalsPatch: Record<string, unknown> = {}
  if (input.equipment === 'ski' || input.equipment === 'board') rentalsPatch.equipment = input.equipment
  if (input.apparelSize != null) {
    const s = input.apparelSize.trim()
    if (s) rentalsPatch.apparel_size = s
  }
  if (input.protectorSize != null) {
    const s = input.protectorSize.trim()
    if (s) rentalsPatch.protector_size = s
  }
  if (input.gloveSize != null) {
    const s = input.gloveSize.trim()
    if (s) rentalsPatch.glove_size = s
  }
  // 옵션 플래그(어드민 보정) — 명시된 것만. 끄면 해당 사이즈 제거.
  const flagFields: { flag: boolean | undefined; key: string; size: string | null }[] = [
    { flag: input.apparel, key: 'apparel', size: 'apparel_size' },
    { flag: input.protector, key: 'protector', size: 'protector_size' },
    { flag: input.goggle, key: 'goggle', size: null },
    { flag: input.glove, key: 'glove', size: 'glove_size' },
  ]
  for (const f of flagFields) {
    if (typeof f.flag === 'boolean') {
      rentalsPatch[f.key] = f.flag
      if (!f.flag && f.size) rentalsPatch[f.size] = null
    }
  }
  if (typeof input.insuranceWanted === 'boolean') rentalsPatch.insurance_wanted = input.insuranceWanted
  if (Object.keys(rentalsPatch).length > 0) {
    const { data: cur, error: fetchErr } = await supabaseAdmin
      .from('participants')
      .select('rentals')
      .eq('id', participantId)
      .single()
    if (fetchErr) {
      console.error('[participantDetail] fetch rentals:', fetchErr)
      return { ok: false, error: '저장 중 오류가 발생했습니다.' }
    }
    const existing = (cur?.rentals as Record<string, unknown> | null) ?? {}
    patch.rentals = { ...existing, ...rentalsPatch }
  }

  if (Object.keys(patch).length === 0) return { ok: false, error: '입력된 값이 없습니다.' }

  const { error } = await supabaseAdmin.from('participants').update(patch).eq('id', participantId)
  if (error) {
    console.error('[participantDetail] update:', error)
    return { ok: false, error: '저장 중 오류가 발생했습니다.' }
  }
  return { ok: true }
}
