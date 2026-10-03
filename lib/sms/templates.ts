// 솔라피 문자 문안 — 문구 수정은 이 파일에서만 한다. (2026-10-03 사용자 확정 문안 8종)
// 문안 안의 #{변수} 표기는 알림톡 템플릿 변수명과 같게 유지한다(알림톡 등록 시 그대로 사용).
// 규칙: 필수 변수가 하나라도 비면 문자를 보내지 않는다 → 호출측이 '보류(누락 항목)'로 이력만 남긴다.
//       금액 변수는 천 단위 쉼표 숫자만('원'은 문안에 포함), 날짜는 YYYY.MM.DD.
import type { SmsKind, SmsMessage } from './types'

export const SMS_ORG = '체육교육회'
// 문안 하단·공지 링크 기준 주소. 공지URL 은 NEXT_PUBLIC_SITE_URL(https)이 있으면 그것을 쓴다.
export const SMS_SITE_HOST = 'www.pea2025.co.kr'

const COMMON = ['신청자명', '신청번호', '신청차수', '일정'] as const

const HELLO = `안녕하세요. ${SMS_ORG}입니다.`
const FOOTER = `문의: 홈페이지 ‘1:1 문의’\n${SMS_SITE_HOST}\n\n감사합니다.`

interface Template {
  subject: string // LMS 제목
  vars: readonly string[] // 필수 변수(공통 포함)
  body: string
}

export const SMS_TEMPLATES: Record<SmsKind, Template> = {
  deposit_notice: {
    subject: '참가 신청 접수 안내',
    vars: [...COMMON, '결제금액', '계좌정보', '입금기한', '입금자명'],
    body: `${HELLO}

#{신청자명}님의 참가 신청이 접수되었습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
참가비: #{결제금액}원
계좌정보: #{계좌정보}
입금기한: #{입금기한}
입금자명: #{입금자명}

기한 내 참가비를 입금해 주세요.
입금 확인 후 참가 상태를 안내드립니다.

※ 신청 수정: 마이페이지 ‘신청 확인’
※ 해당 회차 연수 시작 2주 전부터 수정 불가

${FOOTER}`,
  },
  deposit_initial: {
    subject: '입금 확인 안내',
    vars: [...COMMON, '확인금액', '참가상태'],
    body: `${HELLO}

#{신청자명}님의 참가비 입금이 확인되었습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
확인금액: #{확인금액}원
참가상태: #{참가상태}

회차별 일정과 참가 안내는 홈페이지 공지사항을 확인해 주세요.

※ 환불 요청: 마이페이지
※ 요청 전 홈페이지 환불 규정 확인

${FOOTER}`,
  },
  due_notice: {
    subject: '추가입금 안내',
    vars: [...COMMON, '추가금액', '계좌정보', '총결제금액', '입금기한'],
    body: `${HELLO}

#{신청자명}님의 신청내용 수정으로 인해
추가납부 금액이 발생했습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
추가금액: #{추가금액}원
계좌정보: #{계좌정보}
총 참가비: #{총결제금액}원
입금기한: #{입금기한}

기한 내 추가금액을 입금해 주세요.

${FOOTER}`,
  },
  deposit_additional: {
    subject: '추가입금 확인 안내',
    vars: [...COMMON, '추가금액', '총결제금액'],
    body: `${HELLO}

#{신청자명}님의 추가입금이 확인되었습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
추가금액: #{추가금액}원
총 참가비: #{총결제금액}원

${FOOTER}`,
  },
  refund_received: {
    subject: '환불 요청 접수 안내',
    vars: [...COMMON, '환불구분', '요청금액', '접수일'],
    body: `${HELLO}

#{신청자명}님의 환불 요청이 접수되었습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
환불구분: #{환불구분}
요청금액: #{요청금액}원
접수일: #{접수일}

환불 규정에 따라 확인 후 처리하며, 완료 시 다시 안내드립니다.
최종 환불금액은 요청금액과 다를 수 있습니다.

${FOOTER}`,
  },
  refund_completed: {
    subject: '환불 완료 안내',
    vars: [...COMMON, '환불구분', '환불금액', '처리일'],
    body: `${HELLO}

#{신청자명}님의 환불이 완료되었습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
환불구분: #{환불구분}
환불금액: #{환불금액}원
처리일: #{처리일}

입금 내역을 확인해 주세요.

${FOOTER}`,
  },
  auto_cancelled: {
    subject: '신청 취소 안내',
    vars: [...COMMON, '취소일', '취소사유'],
    body: `${HELLO}

#{신청자명}님의 참가 신청이 취소되었습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
취소일: #{취소일}
취소사유: #{취소사유}

${FOOTER}`,
  },
  event_reminder: {
    subject: '연수 일주일 전 안내',
    vars: [...COMMON, '공지URL'],
    body: `${HELLO}

#{신청자명}님, 행사 일정이 일주일 앞으로 다가왔습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}

집결시간·장소·준비물 등 차수별 안내사항을 반드시 확인해 주세요.

공지 바로가기: #{공지URL}

${FOOTER}`,
  },
}

export type SmsVars = Record<string, string | null | undefined>

export interface Rendered {
  message: SmsMessage
  missing: string[] // 비어 있는 필수 변수 이름(#{} 표기 없이). 비어 있지 않으면 발송 보류.
}

// 변수 치환. 누락 변수는 #{이름} 그대로 남겨 보류 이력에서 어디가 비었는지 보이게 한다.
export function renderSms(kind: SmsKind, vars: SmsVars): Rendered {
  const t = SMS_TEMPLATES[kind]
  const missing = t.vars.filter((k) => !(vars[k] ?? '').trim())
  const text = t.body.replace(/#\{([^}]+)\}/g, (all, k: string) => {
    const v = (vars[k] ?? '').trim()
    return v || all
  })
  const message: SmsMessage =
    smsBytes(text) <= 90 ? { type: 'SMS', subject: null, text } : { type: 'LMS', subject: `[${SMS_ORG}] ${t.subject}`, text }
  return { message, missing }
}

// ── 값 서식 ──

// 금액: 천 단위 쉼표 숫자만(‘원’ 없음). 숫자가 아니거나 음수면 null(누락 처리).
export function fmtAmount(n: number | null | undefined): string | null {
  if (n == null || !Number.isFinite(n) || n < 0) return null
  return String(Math.trunc(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',')
}

// 한국시간 날짜(YYYY.MM.DD).
export function kstDate(iso: string): string {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000)
  const p = (v: number) => String(v).padStart(2, '0')
  return `${d.getUTCFullYear()}.${p(d.getUTCMonth() + 1)}.${p(d.getUTCDate())}`
}

// 일정: 차수 시작~종료일(DB date 'YYYY-MM-DD') + 박수. 예: 2027.01.11 ~ 2027.01.13 (2박)
export function fmtSchedule(startsOn: string | null | undefined, endsOn: string | null | undefined, nights: number | null | undefined): string | null {
  if (!startsOn || !endsOn) return null
  const d = (s: string) => s.slice(0, 10).replaceAll('-', '.')
  const range = startsOn === endsOn ? d(startsOn) : `${d(startsOn)} ~ ${d(endsOn)}`
  return nights && nights > 0 ? `${range} (${nights}박)` : range
}

// 계좌정보: 은행·계좌번호·예금주. 하나라도 비었거나 자리표시 계좌번호(0 과 - 만)면 null(누락 처리).
export function fmtAccount(a: { bank?: string | null; account?: string | null; holder?: string | null }): string | null {
  const bank = a.bank?.trim()
  const account = a.account?.trim()
  const holder = a.holder?.trim()
  if (!bank || !account || !holder || /^[0\-\s]+$/.test(account)) return null
  return `${bank} ${account} (예금주: ${holder})`
}

// 문자 바이트 수(EUC-KR 기준 근사: ASCII 1, 그 외 2). SMS 90바이트 초과 시 LMS.
export function smsBytes(text: string): number {
  let n = 0
  for (const ch of text) n += ch.charCodeAt(0) <= 0x7f ? 1 : 2
  return n
}
