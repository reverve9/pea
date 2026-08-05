// 신청 제출 payload 타입 — 클라(폼)에서 만들고 서버(/api/applications)에서 검증·저장한다.
// ⚠ 순수 타입만. 'server-only' 금지(폼에서 import). 금액은 서버가 price_items 로 재계산하므로
//    클라가 보낸 total 은 신뢰하지 않는다(표시용일 뿐 payload 에 넣지 않음).

export type ApplyKind = 'jikmu' | 'jayul'
export type Gender = 'male' | 'female'
export type RoomType = 'group' | 'private'

// 대표(직무=참가자 본인 / 자율=대표 신청자) 기본 정보 — 두 폼 공통.
export interface ApplicantInput {
  name: string
  gender: '' | Gender
  phone: string
  birthFront: string // YYMMDD
}

export interface JikmuPayload {
  kind: 'jikmu'
  sessionId: string
  applicant: ApplicantInput
  insurance: boolean
  birthBack: string // 보험 희망 시 7자리(서버에서 암호화). 미희망 시 ''
  lessonSport: '' | 'ski' | 'board'
  lessonClass: string
  roomType: '' | RoomType
  roomSpec: string // room_surcharge item_key(개별객실일 때)
  rentals: { apparel: boolean; goggle: boolean; protector: boolean; glove: boolean }
  apparelSize: string // 의류 사이즈(S/M/L/XL/2XL). 고글은 사이즈 없음
  protectorSize: string // 보호대 사이즈(S/M/L)
  gloveSize: string // 장갑 사이즈(S/M/L)
  hasCompanion: boolean
  companion: string
  companionPhone: string
  notes: string
  payerDiffers: boolean
  payerName: string
  cashReceiptType: 'personal' | 'business' | 'none' // 현금영수증 발급유형(소득공제/지출증빙/발급안함)
  cashReceiptBizno: string // 지출증빙 시 사업자번호(숫자). 그 외 ''
  routes: string[]
  privacyConsent: boolean
  marketingOptIn: boolean
}

export interface JayulCompanionInput {
  name: string
  phone: string
  insurance: boolean
}

export interface JayulPayload {
  kind: 'jayul'
  sessionId: string
  variant: '' | 'weekday_2n' | 'weekend_2n' | 'weekend_1n'
  headcount: number // 1~6
  applicant: ApplicantInput
  lessonClass: string // 대표 기초강습(jayul_ski/jayul_board/jayul_freeride) — 참고이미지 10번
  equipment: '' | 'ski' | 'board' // 대표 대여 장비 세트 타입 — 금액 무관
  rentals: { apparel: number; goggle: number; protector: number; glove: number } // 항목별 구매 수량(비용 계산). 사이즈·귀속은 신청 후 대표 배정
  // 개별(추가) 강습 — 기본 포함인 그룹 체험 강습과 별도. 수량만큼 시간대를 고르며 중복 선택 가능.
  // slots.length === qty (서버 검증). 슬롯 목록은 박수에 따라 다름(lessonSlotsFor).
  privateLesson: { qty: number; slots: string[] }
  repInsurance: boolean
  // 동반 참가자 상세는 신청폼에서 안 받는다 — 인원수만. 슬롯은 제출 시 생성, 정보는 신청 후 입력. [[companion-detail-post-signup-fill]]
  note: string
  payerDiffers: boolean
  payerName: string
  cashReceiptType: 'personal' | 'business' | 'none' // 현금영수증 발급유형(소득공제/지출증빙/발급안함)
  cashReceiptBizno: string // 지출증빙 시 사업자번호(숫자). 그 외 ''
  routes: string[]
  privacyConsent: boolean
  marketingOptIn: boolean
}

export type ApplyPayload = JikmuPayload | JayulPayload

// 제출 응답 — 완료 화면에서 신청번호를 크게 노출. waitlisted=정원 초과 예비(대기) 접수.
export interface ApplyResult {
  application_no: string
  waitlisted: boolean
}

// ── 마이페이지 본인확인 ──
export interface MyVerifyInput {
  name: string
  phone: string
  birth: string // YYMMDD
}
export interface MyVerifyResult {
  token: string
  name: string
}
export interface MyApplicationRow {
  id: string
  application_no: string
  kind: ApplyKind
  track_label: string
  period: string
  starts_on: string // 연수 시작일 'YYYY-MM-DD' — 참가자 입력 마감(시작−10일) 계산용
  applicant_name: string
  payer_name: string | null // 신청 시 입금자명(payerDiffers) — 입금확인요청 프리필용
  headcount: number
  total_amount: number
  due_amount: number // 추가결제 부족분(수정 증액). >0 이면 '입금대기(추가)' 표시
  due_claimed: boolean // 추가입금 완료 신고 여부(고객이 눌러 어드민 대조 대기)
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded'
  payment_claimed: boolean // 입금 확인 요청(신고) 여부
  created_at: string
  // 요청 처리 현황 — 고객에게 상태·답변 노출(어드민 처리 결과 도달). [[requests-reorg-modification-restructure]]
  modifications: MyModificationRow[]
  refunds: MyRefundRow[]
}

// 마이페이지 요청 현황 — 고객 노출용 최소 필드. 내부메모(internal_note/admin_memo)는 절대 싣지 않는다.
export interface MyModificationRow {
  status: 'pending' | 'completed' | 'rejected'
  changes_summary: string // 변경 항목 라벨 요약(예: '연락처 · 성함')
  admin_reply: string | null // 완료/반려 시 고객 통지 답변
  created_at: string
}
export interface MyRefundRow {
  status: 'requested' | 'confirmed' | 'completed'
  origin: 'user' | 'modification' | 'admin' // 고객 환불신청 / 수정 감액 자동 / 관리자 직접
  amount: number | null // 요청/예상 환불액
  created_at: string
}

// 마이페이지 참가자 로스터 — 대표가 동반인 후속정보를 대신 입력할 때 쓰는 안전 필드만.
// 주민번호 뒷자리(birth_back)는 절대 싣지 않는다 — has_insurance 플래그로만 등록여부 노출.
export interface MyRosterParticipant {
  id: string
  name: string
  is_leader: boolean
  sort_order: number // 0=대표, 1·2…=참가자 순번(라벨 '참가자 N' 계산용)
  gender: Gender | null
  phone: string | null
  birth_front: string | null
  lesson_level: string | null
  equipment: string | null // rentals.equipment(용품세트 스키/보드)
  // 렌탈 옵션 귀속(대표 배정) + 사이즈(참가자 입력). 고글은 사이즈 없음.
  apparel: boolean
  apparel_size: string | null
  protector: boolean
  protector_size: string | null
  goggle: boolean
  glove: boolean
  glove_size: string | null
  insurance_wanted: boolean // 대표 배정 보험 여부(뒷자리는 참가자가 write-only 입력)
  has_insurance: boolean // birth_back_enc != null(뒷자리 실제 등록됨)
}

// 신청 시 구매한 렌탈 수량 — 대표 배정 정합성 대조 원천(price_breakdown.meta.rental_qty).
export interface RentalQty {
  apparel: number
  goggle: number
  protector: number
  glove: number
}

// 마이 로스터 응답 — 참가자 목록 + 구매 수량(배정 카운터용).
export interface RosterResult {
  roster: MyRosterParticipant[]
  rentalQty: RentalQty
}

// 대표 렌탈 배정 — 참가자별 옵션 귀속 + 보험 여부. 사이즈는 참가자가 별도 입력.
export interface RentalAssignmentInput {
  participantId: string
  apparel: boolean
  protector: boolean
  goggle: boolean
  glove: boolean
  insuranceWanted: boolean
}

// 셀프필 공개페이지 헤더 요약 — 어떤 신청인지 최소 식별(연수유형·일정·대표명). 금액·연락처 미노출.
export interface RosterSummary {
  track_label: string
  period: string
  starts_on: string // 연수 시작일 'YYYY-MM-DD' — 셀프필 입력 마감 계산·안내용
  applicant_name: string
}

// 참가자 후속입력 페이로드(마이페이지 대표 대신입력). 서버의 ParticipantDetailInput 과 동일 필드셋(클라 안전 사본).
export interface MyParticipantInput {
  name?: string
  phone?: string
  birthFront?: string
  gender?: string
  birthBack?: string
  lessonClass?: string
  equipment?: string
  apparelSize?: string
  protectorSize?: string
  gloveSize?: string
}
