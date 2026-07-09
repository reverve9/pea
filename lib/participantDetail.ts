import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'
import { encryptSecret } from './serverCrypto'
import { isDetailFillClosed } from './fillDeadline'

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
  // 참가자 + 소속 신청/회차를 한 번만 조회 — 입력 마감 검증·rentals 병합·대표 동기화에 공용.
  const { data: cur, error: fetchErr } = await supabaseAdmin
    .from('participants')
    .select('rentals, is_leader, application_id, application:applications(session:sessions(starts_on))')
    .eq('id', participantId)
    .single()
  if (fetchErr || !cur) {
    console.error('[participantDetail] fetch participant:', fetchErr)
    return { ok: false, error: '저장 중 오류가 발생했습니다.' }
  }
  // 입력 마감(연수 시작 − 10일) 이후엔 직접 입력/수정 잠금 → 수정요청 경로로. starts_on 불명 시 통과(fail-open).
  const appRaw = (cur as { application?: unknown }).application
  const app = Array.isArray(appRaw) ? appRaw[0] : appRaw
  const sessRaw = (app as { session?: unknown } | null)?.session
  const sess = Array.isArray(sessRaw) ? sessRaw[0] : sessRaw
  const startsOn = (sess as { starts_on?: string } | null)?.starts_on
  if (startsOn && isDetailFillClosed(startsOn)) {
    return { ok: false, error: '참가자 정보 입력 마감(연수 시작 10일 전)이 지났습니다. 변경이 필요하면 수정요청을 이용해 주세요.' }
  }
  const isLeader = cur.is_leader === true
  const applicationId = (cur.application_id as string | null) ?? null

  const patch: Record<string, unknown> = {}

  if (input.name != null) {
    const n = input.name.trim()
    if (n) patch.name = n
  }
  if (input.phone != null) {
    const p = input.phone.replace(/\D/g, '') // phone 컬럼은 숫자만(participants/applications digits CHECK)
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

  // rentals(jsonb)는 반드시 병합 — 위에서 조회한 현재 값에 spread(insurance_wanted 등 보존).
  if (Object.keys(rentalsPatch).length > 0) {
    const existing = (cur.rentals as Record<string, unknown> | null) ?? {}
    patch.rentals = { ...existing, ...rentalsPatch }
  }

  if (Object.keys(patch).length === 0) return { ok: false, error: '입력된 값이 없습니다.' }

  const { error } = await supabaseAdmin.from('participants').update(patch).eq('id', participantId)
  if (error) {
    console.error('[participantDetail] update:', error)
    return { ok: false, error: '저장 중 오류가 발생했습니다.' }
  }

  // 대표 참가자면 신청서의 신청자 성함·연락처도 함께 갱신(목록·상세·엑셀 표기 일관성). 참가자는 이미 저장됨.
  if (isLeader && applicationId && (patch.name != null || patch.phone != null)) {
    const appPatch: Record<string, unknown> = { updated_at: new Date().toISOString() }
    if (patch.name != null) appPatch.applicant_name = patch.name
    if (patch.phone != null) appPatch.phone = patch.phone
    const { error: appErr } = await supabaseAdmin.from('applications').update(appPatch).eq('id', applicationId)
    if (appErr) console.error('[participantDetail] sync applicant:', appErr) // 비치명: 참가자 저장은 성공
  }

  return { ok: true }
}
