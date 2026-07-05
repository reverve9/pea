import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'
import { encryptSecret } from './serverCrypto'

// 참가자 상세(생년월일·성별·주민번호 뒷자리) 갱신 — 신청 완료 후 채우는 값.
// 어드민 수기 입력과 동반인 셀프필(토큰) 두 경로가 공유하는 단일 갱신 로직. 뒷자리는 서버에서 암호화 저장.
// undefined = 미변경(해당 필드 건드리지 않음), 빈문자 = 무시(기존 값 유지). 실수로 값이 지워지지 않게 보수적.

export interface ParticipantDetailInput {
  birthFront?: string // YYMMDD 6자리
  gender?: string // 'male' | 'female' | '' (그 외/빈값 → 미변경)
  birthBack?: string // 주민번호 뒷자리 7자리(보험용). 빈값 → 미변경
}
export type ParticipantUpdateResult = { ok: true } | { ok: false; error: string }

export async function updateParticipantDetail(
  participantId: string,
  input: ParticipantDetailInput,
): Promise<ParticipantUpdateResult> {
  const patch: Record<string, unknown> = {}

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

  if (Object.keys(patch).length === 0) return { ok: false, error: '입력된 값이 없습니다.' }

  const { error } = await supabaseAdmin.from('participants').update(patch).eq('id', participantId)
  if (error) {
    console.error('[participantDetail] update:', error)
    return { ok: false, error: '저장 중 오류가 발생했습니다.' }
  }
  return { ok: true }
}
