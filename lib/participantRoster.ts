import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'
import { formatPeriod, SCHEDULE_TYPE } from './display'
import type { MyRosterParticipant, RosterSummary } from './applicationTypes'
import type { ScheduleType } from './types'

// 참가자 로스터 조회 — 마이페이지(대표 대신입력)·셀프필(동반인 각자입력) 공용.
// 안전 필드만 반환: 주민번호 뒷자리(birth_back)는 절대 싣지 않고 has_insurance 플래그로만.

type RosterRow = {
  id: string
  name: string
  is_leader: boolean
  gender: 'male' | 'female' | null
  phone: string | null
  birth_front: string | null
  lesson_level: string | null
  rentals: Record<string, unknown> | null
  birth_back_enc: string | null
  sort_order: number
}

export async function getRoster(applicationId: string): Promise<MyRosterParticipant[]> {
  const { data, error } = await supabaseAdmin
    .from('participants')
    .select('id, name, is_leader, gender, phone, birth_front, lesson_level, rentals, birth_back_enc, sort_order')
    .eq('application_id', applicationId)
    .order('sort_order', { ascending: true })
  if (error) throw error
  return ((data as unknown as RosterRow[]) ?? []).map((p) => {
    const r = p.rentals ?? {}
    return {
      id: p.id,
      name: p.name,
      is_leader: p.is_leader,
      sort_order: p.sort_order,
      gender: p.gender,
      phone: p.phone,
      birth_front: p.birth_front,
      lesson_level: p.lesson_level,
      equipment: typeof r.equipment === 'string' ? r.equipment : null,
      apparel: r.apparel === true,
      apparel_size: typeof r.apparel_size === 'string' ? r.apparel_size : null,
      protector: r.protector === true,
      protector_size: typeof r.protector_size === 'string' ? r.protector_size : null,
      goggle: r.goggle === true,
      glove: r.glove === true,
      glove_size: typeof r.glove_size === 'string' ? r.glove_size : null,
      insurance_wanted: r.insurance_wanted === true,
      has_insurance: p.birth_back_enc != null,
    }
  })
}

// 개별 셀프필 로스터 — 링크 토큰의 참가자(pid) 한 명만. 다른 참가자 정보는 노출 안 함.
//   pid 가 해당 신청(aid) 소속인지도 함께 검증(스코프 이탈 방지).
export async function getRosterParticipant(
  applicationId: string,
  participantId: string,
): Promise<MyRosterParticipant | null> {
  const roster = await getRoster(applicationId)
  return roster.find((p) => p.id === participantId) ?? null
}

// 셀프필 공개페이지 헤더용 요약 — 어떤 신청인지 최소 식별(연수유형·일정·대표명). 금액·연락처는 미노출.
export async function getRosterSummary(applicationId: string): Promise<RosterSummary | null> {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('applicant_name, session:sessions(schedule_type, starts_on, ends_on, nights)')
    .eq('id', applicationId)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as unknown as {
    applicant_name: string
    session: { schedule_type: ScheduleType; starts_on: string; ends_on: string; nights: number } | null
  }
  const st = row.session?.schedule_type ?? 'jikmu'
  const isJikmu = st === 'jikmu'
  return {
    track_label: isJikmu ? '직무연수' : `자율패키지 · ${SCHEDULE_TYPE[st].label}`,
    period: row.session ? formatPeriod(row.session.starts_on, row.session.ends_on, row.session.nights) : '',
    applicant_name: row.applicant_name,
  }
}
