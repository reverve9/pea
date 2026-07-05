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
  schoolName: string
  region: string
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
  apparelSize: string
  hasCompanion: boolean
  companion: string
  companionPhone: string
  notes: string
  payerDiffers: boolean
  payerName: string
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
  rentals: { apparel: number; goggle: number; protector: number; glove: number }
  apparelSizes: string[]
  repInsurance: boolean
  companions: JayulCompanionInput[]
  note: string
  payerDiffers: boolean
  payerName: string
  routes: string[]
  privacyConsent: boolean
  marketingOptIn: boolean
}

export type ApplyPayload = JikmuPayload | JayulPayload

// 제출 응답 — 완료 화면에서 신청번호를 크게 노출.
export interface ApplyResult {
  application_no: string
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
  applicant_name: string
  headcount: number
  total_amount: number
  status: 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded'
  created_at: string
}
