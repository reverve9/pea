// 솔라피 문자 문안 — 문구 수정은 이 파일에서만 한다. (⚠ 초안: 테스트 발송 전 사용자 확정 필요)
// 원칙: 저장된 신청 정보 기준 · 환불접수 ≠ 환불완료 · 요청금액과 최종 환불금액 구분 ·
//       환불 예정일/처리기간은 확정 정책이 없으므로 안내하지 않음 · 계좌번호 등 불필요한 개인정보 미포함.
import type { SmsMessage } from './types'

export const SMS_ORG = '체육교육회'
export const SMS_CONTACT_TEL = '070-7728-7947'

export interface SmsAppInfo {
  applicationNo: string
  applicantName: string
  programLabel: string // 예: 스키·스노보드 직무연수 · 1차
  period: string // 예: 2027/01/11 – 01/13 (2박)
  isWaitlisted: boolean
}

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`

// 한국시간 날짜(YYYY.MM.DD).
export function kstDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000)
  const p = (v: number) => String(v).padStart(2, '0')
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())}`
}

function appLines(app: SmsAppInfo): string[] {
  const lines = [`■ 신청번호: ${app.applicationNo}`, `■ 신청내역: ${app.programLabel}`]
  if (app.period) lines.push(`■ 일정: ${app.period}`)
  return lines
}

// 참가 확정 여부 — 예비(정원 초과) 접수는 확정으로 안내하지 않는다.
function participationLine(app: SmsAppInfo, additional: boolean): string {
  if (app.isWaitlisted) return '■ 참가: 정원 초과 예비 접수 상태입니다. 참가 확정 여부는 별도로 안내드립니다.'
  return additional ? '■ 참가: 참가 확정 상태가 유지됩니다.' : '■ 참가: 참가가 확정되었습니다.'
}

function footer(myUrl: string | null): string[] {
  const lines: string[] = []
  if (myUrl) lines.push(`신청 조회: ${myUrl}`)
  lines.push(`문의: ${SMS_CONTACT_TEL}`)
  return lines
}

function build(subject: string, lines: string[]): SmsMessage {
  const text = [`[${SMS_ORG}] ${subject}`, ...lines].join('\n')
  return smsBytes(text) <= 90 ? { type: 'SMS', subject: null, text } : { type: 'LMS', subject: `[${SMS_ORG}] ${subject}`, text }
}

// 최초 입금확인 — 관리자 입금확인(최초 전환) 저장 후.
export function depositInitialMessage(i: { app: SmsAppInfo; amount: number; myUrl: string | null }): SmsMessage {
  return build('입금 확인 안내', [
    `${i.app.applicantName}님, 연수비 입금이 확인되었습니다.`,
    '',
    ...appLines(i.app),
    `■ 확인금액: ${won(i.amount)}`,
    participationLine(i.app, false),
    '',
    ...footer(i.myUrl),
  ])
}

// 추가입금 확인 — 수정 증액 부족분 입금확인 저장 후. 최초 입금확인과 문구를 구분한다.
export function depositAdditionalMessage(i: { app: SmsAppInfo; amount: number; total: number; myUrl: string | null }): SmsMessage {
  return build('추가 입금 확인 안내', [
    `${i.app.applicantName}님, 추가 입금이 확인되었습니다.`,
    '',
    ...appLines(i.app),
    `■ 추가 확인금액: ${won(i.amount)}`,
    `■ 총 결제금액: ${won(i.total)}`,
    participationLine(i.app, true),
    '',
    ...footer(i.myUrl),
  ])
}

// 환불접수 — 환불 요청 저장 후. 완료가 아님을 명시하고, 최종 금액은 확인 후 확정임을 구분한다.
export function refundReceivedMessage(i: {
  app: SmsAppInfo
  origin: 'user' | 'modification'
  requestedAmount: number | null
  receivedAt: string
  myUrl: string | null
}): SmsMessage {
  const kindLine =
    i.origin === 'modification' ? '■ 구분: 부분환불 (신청 내용 수정 반영)' : '■ 구분: 신청 취소·환불 요청'
  const amountLine =
    i.requestedAmount != null && i.requestedAmount > 0
      ? `■ 요청금액: ${won(i.requestedAmount)}`
      : '■ 요청금액: 환불 규정에 따라 담당자 확인 후 산정'
  return build('환불 요청 접수 안내', [
    `${i.app.applicantName}님, 환불 요청이 접수되었습니다.`,
    '아직 환불이 완료된 것은 아니며, 처리가 완료되면 완료 안내를 다시 보내드립니다.',
    '',
    ...appLines(i.app),
    kindLine,
    amountLine,
    '■ 최종 환불금액은 담당자 확인 후 확정됩니다.',
    `■ 접수일: ${kstDate(i.receivedAt)}`,
    '',
    ...footer(i.myUrl),
  ])
}

// 환불완료 — 관리자 환불 확정(송금 완료 처리) 저장 후. 실제 환불금액·처리일·대상 환불 건(접수일) 안내.
export function refundCompletedMessage(i: {
  app: SmsAppInfo
  amount: number
  full: boolean
  completedAt: string
  receivedAt: string | null
  myUrl: string | null
}): SmsMessage {
  const lines = [
    `${i.app.applicantName}님, 환불이 완료되었습니다.`,
    '',
    ...appLines(i.app),
    `■ 구분: ${i.full ? '전체환불' : '부분환불'}`,
    `■ 환불금액: ${won(i.amount)}`,
    `■ 처리일: ${kstDate(i.completedAt)}`,
  ]
  if (i.receivedAt) lines.push(`■ 환불 접수일: ${kstDate(i.receivedAt)}`)
  return build('환불 완료 안내', [...lines, '', ...footer(i.myUrl)])
}

// 입금기한 경과 자동취소 — cron 이 취소 저장에 성공한 뒤. 이미 입금한 경우 문의 안내.
export function autoCancelledMessage(i: { app: SmsAppInfo; deadline: string; myUrl: string | null }): SmsMessage {
  return build('신청 취소 안내', [
    `${i.app.applicantName}님, 입금기한(${kstDate(i.deadline)})까지 입금이 확인되지 않아 신청이 자동 취소되었습니다.`,
    '',
    ...appLines(i.app),
    '■ 취소 사유: 입금기한 경과',
    '',
    '이미 입금하셨다면 아래 연락처로 문의해 주시면 확인해 드립니다.',
    '재신청은 홈페이지에서 가능하며, 정원 상황에 따라 제한될 수 있습니다.',
    '',
    ...footer(i.myUrl),
  ])
}

// 문자 바이트 수(EUC-KR 기준 근사: ASCII 1, 그 외 2). SMS 90바이트 초과 시 LMS.
export function smsBytes(text: string): number {
  let n = 0
  for (const ch of text) n += ch.charCodeAt(0) <= 0x7f ? 1 : 2
  return n
}
