// Phase 2b — 표시용 매핑/포맷 유틸(코드값 → 한글 라벨, 금액·날짜 포맷).
// 순수 함수만. 스타일 없음.

import type { BadgeColor } from '@/components/common/Badge'
import type { CourseStatus, ScheduleType, NoticeCategory, RefundStatus, ModificationStatus } from './types'

// 과정 상태 → 라벨 + 배지색 (Phase 2.5 딥네이비 톤 키)
export const COURSE_STATUS: Record<CourseStatus, { label: string; color: BadgeColor }> = {
  open: { label: '접수중', color: 'navy' },
  preparing: { label: '개설 준비중', color: 'amber' },
  closed: { label: '마감', color: 'slate' },
}

// 신청 status → 라벨 + 배지색 (§2). 확정 2종(paid/completed)만 배경 채도 진하게. Phase 4 마이페이지에서 사용.
export type ApplicationStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded'
export const APPLICATION_STATUS: Record<ApplicationStatus, { label: string; color: BadgeColor }> = {
  pending: { label: '입금대기', color: 'amber' },
  paid: { label: '입금확인', color: 'navy' },
  completed: { label: '연수완료', color: 'emerald' },
  cancelled: { label: '취소', color: 'slate' },
  refunded: { label: '환불완료', color: 'terracotta' },
}

// 일정 유형 → 라벨 + 배지색 (달력 범례/차수 표시용 — §5 범위밖, 레거시 색 키 유지)
export const SCHEDULE_TYPE: Record<ScheduleType, { label: string; color: BadgeColor }> = {
  jikmu: { label: '직무연수', color: 'orange' },
  weekday_2n: { label: '주중 2박', color: 'blue' },
  weekend_2n: { label: '주말 2박', color: 'green' },
  weekend_1n: { label: '주말 1박', color: 'gray' },
}

// 공지 카테고리 → 라벨 + 배지색
export const NOTICE_CATEGORY: Record<NoticeCategory, { label: string; color: BadgeColor }> = {
  general: { label: '일반', color: 'slate' },
  program: { label: '프로그램', color: 'navy' },
  result: { label: '결과발표', color: 'emerald' },
}

// 환불 요청 status → 라벨 + 배지색 (계획안 ②: 신청대기/신청확인/환불완료). 스키마엔 '반려' 없음.
export const REFUND_STATUS: Record<RefundStatus, { label: string; color: BadgeColor }> = {
  requested: { label: '신청대기', color: 'amber' },
  confirmed: { label: '신청확인', color: 'navy' },
  completed: { label: '환불완료', color: 'emerald' },
}

// 수정 요청 status → 라벨 + 배지색 (3단 단순화: 대기/완료/반려).
export const MODIFICATION_STATUS: Record<ModificationStatus, { label: string; color: BadgeColor }> = {
  pending: { label: '처리대기', color: 'amber' },
  completed: { label: '처리완료', color: 'emerald' },
  rejected: { label: '반려', color: 'slate' },
}

// 수정요청 정형 필드 라벨 — changes 원소 label 생성/표시 공용.
export const MODIFICATION_FIELD_LABEL: Record<string, string> = {
  name: '성함',
  phone: '연락처',
  birth_front: '생년월일',
  gender: '성별',
  lesson_level: '기초강습',
  equipment: '용품세트',
  rental_apparel: '렌탈·의류',
  rental_protector: '렌탈·보호대',
  rental_goggle: '렌탈·고글',
  rental_glove: '렌탈·장갑',
}

// 원화 포맷: 303000 → "303,000원"
export function formatKRW(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`
}

// "2027-01-11" → "2027/01/11"
export function formatDate(iso: string): string {
  return iso.replaceAll('-', '/')
}

// 기간: "2027-01-11" ~ "2027-01-13" → "2027/01/11 – 01/13 (2박)"
// 일정 기간은 슬래시 표기(신청일·게시판 날짜 formatDate 점 표기와 구분).
export function formatPeriod(startsOn: string, endsOn: string, nights: number): string {
  const start = startsOn.replaceAll('-', '/') // 2027/01/11
  const end = endsOn.slice(5).replace('-', '/') // MM/DD
  return `${start} – ${end} (${nights}박)`
}
