// Phase 2b — 표시용 매핑/포맷 유틸(코드값 → 한글 라벨, 금액·날짜 포맷).
// 순수 함수만. 스타일 없음.

import type { BadgeColor } from '@/components/common/Badge'
import type { CourseStatus, ScheduleType } from './types'

// 과정 상태 → 라벨 + 배지색
export const COURSE_STATUS: Record<CourseStatus, { label: string; color: BadgeColor }> = {
  open: { label: '접수중', color: 'green' },
  preparing: { label: '개설 준비중', color: 'orange' },
  closed: { label: '마감', color: 'gray' },
}

// 일정 유형 → 라벨 + 배지색 (달력 범례/차수 표시용)
export const SCHEDULE_TYPE: Record<ScheduleType, { label: string; color: BadgeColor }> = {
  jikmu: { label: '직무연수', color: 'orange' },
  weekday_2n: { label: '주중 2박', color: 'blue' },
  weekend_2n: { label: '주말 2박', color: 'green' },
  weekend_1n: { label: '주말 1박', color: 'gray' },
}

// 원화 포맷: 303000 → "303,000원"
export function formatKRW(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

// "2027-01-11" → "2027.01.11"
export function formatDate(iso: string): string {
  return iso.replaceAll('-', '.')
}

// 기간: "2027-01-11" ~ "2027-01-13" → "2027.01.11 – 01.13 (2박)"
export function formatPeriod(startsOn: string, endsOn: string, nights: number): string {
  const start = formatDate(startsOn)
  const end = endsOn.slice(5).replace('-', '.') // MM.DD
  return `${start} – ${end} (${nights}박)`
}
