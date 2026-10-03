// 솔라피 문자 발송 공통 타입 — 앱(서버)과 단위 시험이 함께 쓴다. 런타임 의존성 없음.

// deposit_notice=접수완료·입금안내, waitlist_notice=예비접수 안내, due_notice=추가입금 안내(수정 반영 시),
// event_reminder=차수 1주일 전 행사 안내.
export type SmsKind =
  | 'deposit_notice'
  | 'waitlist_notice'
  | 'deposit_initial'
  | 'due_notice'
  | 'deposit_additional'
  | 'refund_received'
  | 'refund_completed'
  | 'auto_cancelled'
  | 'event_reminder'
export type SmsStatus = 'sending' | 'sent' | 'failed' | 'unknown' | 'held'
export type SmsMsgType = 'SMS' | 'LMS'

export interface SmsMessage {
  type: SmsMsgType
  subject: string | null // LMS 제목(SMS 는 null)
  text: string
}

// 발송 이력 1행(sms_notifications).
export interface SmsLog {
  id: string
  dedupe_key: string
  kind: SmsKind
  application_id: string | null
  refund_request_id: string | null
  recipient: string
  msg_type: SmsMsgType
  subject: string | null
  body: string
  status: SmsStatus
  attempts: number
  provider_message_id: string | null
  provider_group_id: string | null
  provider_status_code: string | null
  provider_status_message: string | null
  last_error: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

// 외부 발송 결과 — 접수/거절(미발송 확정)/불명확 3갈래.
export type SendOutcome =
  | { kind: 'accepted'; messageId: string | null; groupId: string | null; statusCode: string | null; statusMessage: string | null }
  | { kind: 'rejected'; statusCode: string | null; statusMessage: string | null; error: string }
  | { kind: 'unknown'; error: string }

// 조회 결과 — 찾음(코드)/없음/조회 실패.
export type LookupOutcome =
  | { kind: 'found'; messageId: string; groupId: string | null; statusCode: string | null; statusMessage: string | null }
  | { kind: 'not_found' }
  | { kind: 'ambiguous'; count: number } // 같은 수신·발신번호 발송 건은 있으나 식별값 불일치 — 수동 확인
  | { kind: 'error'; error: string }

export interface SmsProvider {
  send(input: { to: string; from: string; message: SmsMessage; notificationId: string }): Promise<SendOutcome>
  lookup(input: { messageId: string | null; to: string; from: string; notificationId: string; since: string }): Promise<LookupOutcome>
}

export interface SmsConfig {
  enabled: boolean // SMS_ENABLED=true 일 때만 실발송
  apiKey: string | null
  apiSecret: string | null
  sender: string | null // 등록된 발신번호(숫자)
  allowlist: string[] | null // 지정 시 이 번호들만 실발송(테스트용), 나머지 held
  missing: string[] // 비어 있는 필수 키 이름
}

export type InsertResult = { kind: 'inserted'; row: SmsLog } | { kind: 'duplicate' } | { kind: 'error'; error: string }

// 저장 포트 — 실제 구현은 Supabase(store.ts), 시험은 메모리.
export interface SmsStore {
  insert(row: {
    dedupe_key: string
    kind: SmsKind
    application_id: string | null
    refund_request_id: string | null
    recipient: string
    msg_type: SmsMsgType
    subject: string | null
    body: string
    status: SmsStatus
    attempts: number
    last_error: string | null
  }): Promise<InsertResult>
  get(id: string): Promise<SmsLog | null>
  // 조건부 갱신 — 현재 status·attempts 가 기대값과 같을 때만. 반영된 행(없으면 null).
  update(id: string, expect: { status: SmsStatus[]; attempts: number }, patch: Partial<SmsLog>): Promise<SmsLog | null>
}
