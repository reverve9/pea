import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'

// 회차 정원(오버부킹 소프트 대기) 집계 — 제출 파이프라인·어드민 sessions 공용. [[admin-mutation-architecture]]
// 정책(오너 확정): 정원을 점유하는 상태 = pending·paid·completed(취소·환불 제외). 대기(is_waitlisted)는 점유에서 제외.

export const OCCUPYING_STATUSES = ['pending', 'paid', 'completed'] as const

// 신청 1건의 정원 점유 인원: 자율=pkg_size, 직무=1(대표). 직무 동반인은 별도 신청으로 각자 카운트됨.
export function seatsOf(row: { pkg_size: number | null }): number {
  return row.pkg_size ?? 1
}

export type Occupancy = { occupied: number; waitlisted: number }

// 회차들의 현재 점유 인원(대기 제외) + 대기 인원 집계. 소량 데이터 → JS 합산(카운터 컬럼·트리거 없이 정합).
export async function getSessionOccupancy(
  sessionIds: string[],
): Promise<Map<string, Occupancy>> {
  const map = new Map<string, Occupancy>()
  if (sessionIds.length === 0) return map
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select('session_id, pkg_size, is_waitlisted')
    .in('session_id', sessionIds)
    .in('status', OCCUPYING_STATUSES as unknown as string[])
  if (error) {
    console.warn('[capacity] getSessionOccupancy:', error)
    return map
  }
  const rows = (data ?? []) as { session_id: string; pkg_size: number | null; is_waitlisted: boolean }[]
  for (const r of rows) {
    const cur = map.get(r.session_id) ?? { occupied: 0, waitlisted: 0 }
    const seats = seatsOf(r)
    if (r.is_waitlisted) cur.waitlisted += seats
    else cur.occupied += seats
    map.set(r.session_id, cur)
  }
  return map
}
