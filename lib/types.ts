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

// 어드민 요금 편집용 — 공개 PriceItem에 없는 활성여부 포함(비활성 행도 노출).
export interface PriceItemAdmin extends PriceItem {
  is_active: boolean
}

// 차수별 요금 오버라이드 — 기본가(price_items.amount)를 특정 차수에서만 다른 금액으로 덮어씀(sparse).
export interface SessionPriceOverride {
  session_id: string
  item_key: string
  amount: number
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

// ── 신청 관리(어드민) ──
// service_role 조회. 뒷자리(birth_back_enc)는 목록에 실어보내지 않는다 — has_insurance 플래그만.
// 실제 복호는 상세에서 revealInsuranceRoster 서버 액션이 온디맨드로 처리.
export type ApplicationStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded'

export interface ParticipantAdmin {
  id: string
  name: string
  gender: 'male' | 'female' | null
  phone: string | null
  lesson_level: string | null
  rentals: Record<string, unknown>
  birth_front: string | null
  has_insurance: boolean // birth_back_enc != null (직무=뒷자리 보유 / 자율=insurance_wanted 플래그)
  is_leader: boolean
  line_amount: number
}

export interface ApplicationAdmin {
  id: string
  application_no: string
  applicant_name: string
  phone: string
  payer_name: string | null
  kind: 'jikmu' | 'jayul'
  schedule_type: ScheduleType // 일정구분(sessions.schedule_type) — 유형/일정구분/회차 캐스케이드 필터용
  program_sport: string | null // 프로그램(종목) 필터용 — course.sport
  track_label: string
  session_id: string | null // 회차 필터·집계 키(sessions.id). label은 유형 간 중복 가능 → id로 매칭
  session_label: string // 회차명(sessions.label) — 목록에서 며칠 예약건인지 식별
  period: string
  starts_on: string // 연수 시작일 'YYYY-MM-DD' — 참가자 입력 마감(시작−10일) 계산용
  room_type: 'group' | 'private' | null
  room_spec: string | null
  pkg_size: number | null
  total_amount: number
  refunded_amount: number // 환불 확정액(관리자 수기 설정). status=refunded 또는 부분환불 시 유효
  due_amount: number // 추가결제 부족분(수정 증액). >0 이면 마이페이지 '입금대기(추가)' 표시
  due_claimed_at: string | null // 고객이 추가입금 완료를 신고한 시각(어드민 대조 신호)
  due_settled_amount: number | null // 추가입금 확정 시 보존한 금액(되돌리기용). null=확정된 적 없음
  status: ApplicationStatus
  is_waitlisted: boolean // 소프트 정원 초과 대기분 — 어드민 승인(정원 편입)/거절 대상
  payment_claimed_at: string | null
  payment_claim_name: string | null
  companion_memo: string | null
  special_notes: string | null
  referral_source: string[]
  privacy_agreed: boolean // 수집·활용 동의(필수) 체크 여부
  marketing_opt_in: boolean
  // 자율 렌탈 구매 수량(신청 단위) + 추가강습 — price_breakdown.meta 파생. 직무는 전부 0.
  rental_qty: { apparel: number; goggle: number; protector: number; glove: number }
  private_lesson: { qty: number; slots: string[] }
  admin_memo: string | null
  created_at: string
  participants: ParticipantAdmin[]
  headcount: number
  // pending 이면서 입금완료 신고가 들어온 건 = 관리자 통장대조 대기(우선정렬 대상)
  needs_review: boolean
  // 신고 입금자명이 신청자명과 다르면 대조 하이라이트
  payer_mismatch: boolean
}

// ── 연수 차수(어드민) — sessions CRUD + 정원/신청현황 ──
export interface SessionAdmin {
  id: string
  course_id: string
  course_name: string
  label: string
  schedule_type: ScheduleType
  starts_on: string
  ends_on: string
  nights: number
  capacity: number
  is_active: boolean
  sort_order: number
  occupied: number // 현재 배정 인원(정원 점유 = pending+paid+completed, 예비 제외)
  waitlisted: number // 예비(정원 초과) 인원
}

// 차수 폼의 프로그램(과정) 선택지
export interface CourseOption {
  id: string
  name: string
  course_type: 'jikmu' | 'jayul'
  sport: string | null
}

// 뒷자리 복호 결과(온디맨드 reveal) — 보험명단용
export interface InsuranceRosterEntry {
  id: string
  name: string
  birth_front: string | null
  birth_back: string // 복호된 7자리
}

// ── 요청(어드민) — 신청관리 세그먼트로 흡수(요청관리 메뉴 해체) ──
export type RefundStatus = 'requested' | 'confirmed' | 'completed' | 'rejected'
export type RefundOrigin = 'user' | 'modification' | 'admin' // 고객 환불신청 / 수정 감액 자동생성 / 관리자 직접
export interface RefundRequestAdmin {
  id: string
  application_id: string | null
  application_no: string | null // 연결된 신청(삭제 시 SET NULL)
  applicant_name: string | null
  phone: string
  reason: string | null
  refund_account: string | null
  amount: number | null // 요청/예상 환불액. 수정 감액 자동생성 시 차액
  origin: RefundOrigin
  status: RefundStatus
  admin_memo: string | null
  created_at: string
}

// 수정요청 정형화 — 변경 항목(다중참가자 대응). 자유텍스트 폐기.
export type ModificationField =
  | 'name'
  | 'phone'
  | 'birth_front'
  | 'gender'
  | 'lesson_level'
  | 'equipment'
  | 'rental_apparel'
  | 'rental_protector'
  | 'rental_goggle'
  | 'rental_glove'
  // 렌탈 사이즈 — 미신청→신청 전환 시 최초 접수와 동일하게 사이즈까지 지정(고글은 사이즈 없음).
  | 'rental_apparel_size'
  | 'rental_protector_size'
  | 'rental_glove_size'
  // 보험 가입 희망 — 희망으로 바꿀 때 주민번호 뒷자리 필요. 뒷자리는 changes 에 싣지 않고
  // modification_requests.birth_back_enc 로 암호화 보관(평문 노출 금지).
  | 'insurance'

export interface ModificationChange {
  target: 'participant' | 'application'
  participant_id: string | null
  participant_name: string // 표시용 스냅샷
  field: ModificationField
  label: string // 표시 라벨(예: '연락처')
  current: string // 요청 시점 현재값 스냅샷
  requested: string // 변경 희망값
}

export type ModificationStatus = 'pending' | 'completed' | 'rejected'
export interface ModificationRequestAdmin {
  id: string
  application_id: string | null
  application_no: string | null
  applicant_name: string | null
  phone: string
  changes: ModificationChange[]
  user_note: string | null // 고객 특이사항(보조 자유텍스트)
  internal_note: string | null // 어드민 내부메모(고객 미표시)
  is_secret: boolean
  status: ModificationStatus
  admin_reply: string | null
  created_at: string
}

// ── 증명서 발급(어드민) — v1: 수료증(completion)만. 발급현황 = 연수완료 신청의 참가자 × 발급 원장 ──
export type CertType = 'participation' | 'payment' | 'completion'
export interface CertificateRosterRow {
  participant_id: string
  application_id: string
  application_no: string
  applicant_name: string // 신청 대표(참고용)
  phone: string
  participant_name: string
  is_leader: boolean
  kind: 'jikmu' | 'jayul' // 유형 필터용(직무연수/자율패키지)
  session_label: string // 차수 그룹/필터
  track_label: string
  period: string
  issued: boolean // 수료증 발급 완료 여부
  certificate_id: string | null // 발급 원장 row id(취소용)
  issued_at: string | null
}

// 현금영수증 — 무통장 입금확인 시 자동발급(팝빌 등 대행 API 전제). 환불 시 취소발급.
export type CashReceiptType = 'personal' | 'business' | 'none' // 신청 시 발급의도(소득공제/지출증빙/발급안함)
export type CashReceiptKind = 'issue' | 'cancel'
export type CashReceiptPurpose = 'personal' | 'business' | 'self' // 실제 발급 목적(자진발급=self, 010-000-1234)
export type CashReceiptStatus = 'pending' | 'issued' | 'failed' | 'cancelled'

// 현금영수증 발급현황(어드민) — cash_receipts 원장 1행 = 발급/취소 이벤트 1건.
export interface CashReceiptAdminRow {
  id: string
  application_no: string | null
  applicant_name: string | null
  kind: CashReceiptKind
  purpose: CashReceiptPurpose
  identifier: string // 개인 휴대폰 / 사업자번호 / 자진발급 010-000-1234
  amount: number // 면세 총액
  status: CashReceiptStatus
  approval_no: string | null // 국세청 승인번호(미연동 시 null)
  issued_at: string | null
  created_at: string
  session_label: string | null
  program_kind: 'jikmu' | 'jayul' | null // 유형 필터용
}

export interface SiteContent {
  id: string
  key: string
  title: string | null
  body: string | null
  sort_order: number
}
