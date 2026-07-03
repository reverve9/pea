// Phase 2b — 공개 읽기 테이블 행 타입 (schema 01_schema.sql 기준, 읽기에 필요한 컬럼만).
// mutation/쓰기 테이블 타입은 후속 Phase에서 추가.

export type CourseStatus = 'open' | 'preparing' | 'closed'
export type CourseType = 'jikmu' | 'jayul'

export interface Course {
  id: string
  slug: string
  name: string
  course_type: CourseType
  sport: string | null
  status: CourseStatus
  description: string | null
  thumbnail_url: string | null
  sort_order: number
}

export type ScheduleType = 'weekday_2n' | 'weekend_2n' | 'weekend_1n' | 'jikmu'

export interface Session {
  id: string
  course_id: string
  label: string
  schedule_type: ScheduleType
  starts_on: string // date (YYYY-MM-DD)
  ends_on: string
  nights: number
  capacity: number
  sort_order: number
}

// sessions + courses 조인 결과(과정명 노출용)
export interface SessionWithCourse extends Session {
  course: Pick<Course, 'id' | 'name' | 'course_type' | 'sport'> | null
}

export type PriceCategory = 'jikmu_base' | 'room_surcharge' | 'pkg_price' | 'rental'

export interface PriceItem {
  id: string
  category: PriceCategory
  item_key: string
  label: string
  amount: number
  sort_order: number
}

export type NoticeCategory = 'general' | 'program' | 'result'

export interface Notice {
  id: string
  title: string
  content: string
  category: NoticeCategory
  is_pinned: boolean
  published_at: string | null
  created_at: string
}

export interface Faq {
  id: string
  question: string
  content: string
  sort_order: number
}

// ── 어드민 전용 행 타입(비공개 컬럼 포함) — service_role 서버 조회에서만 사용.
export interface NoticeAdmin extends Notice {
  is_published: boolean
  updated_at: string
}

export interface FaqAdmin extends Faq {
  is_published: boolean
  updated_at: string
}

export type InquiryStatus = 'open' | 'answered'

export interface InquiryAdmin {
  id: string
  phone: string
  name: string | null
  title: string
  content: string
  is_secret: boolean
  status: InquiryStatus
  admin_reply: string | null
  created_at: string
  updated_at: string
}

export interface SiteContent {
  id: string
  key: string
  title: string | null
  body: string | null
  sort_order: number
}
