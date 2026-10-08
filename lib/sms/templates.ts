// 알림톡 문안 — 카카오 검수 템플릿 10종(2026-10-05 등록). 문구 수정은 이 파일에서만 한다.
// ⚠ 본문은 카카오 승인 템플릿과 글자·줄바꿈까지 같아야 한다(템플릿 ID 는 alimtalk.ts). #{변수} 이름도 승인본과 같게.
// 규칙: 필수 변수가 하나라도 비면 보내지 않는다 → 호출측이 '보류(누락 항목)'로 이력만 남긴다.
//       금액 변수는 천 단위 쉼표 숫자만('원'은 문안에 포함), 날짜는 YYYY.MM.DD.
import type { SmsKind, SmsMessage } from './types'

// 공지 링크 기준 주소. 공지 URL 은 NEXT_PUBLIC_SITE_URL(https)이 있으면 그것을 쓴다.
export const SMS_SITE_HOST = 'www.pea2025.co.kr'

interface Template {
  vars: readonly string[] // 필수 변수 = 본문의 #{변수} 전부
  body: string
}

// 아래 본문은 _ref/솔라피_알림톡_10종_2026-10-05.json(솔라피 콘솔 스냅샷)에서 그대로 옮겼다. 손으로 고치지 말고 승인본이 바뀌면 다시 옮긴다.
export const SMS_TEMPLATES: Record<SmsKind, Template> = {
  // PEA 접수완료·입금안내 (KA01TP261004042413184qfiYDBON09g)
  deposit_notice: {
    vars: ['신청자명', '신청번호', '신청차수', '일정', '결제금액', '계좌정보', '입금기한', '입금자명'],
    body: `안녕하세요. 체육교육회입니다.

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

문의: 홈페이지 ‘1:1 문의’
www.pea2025.co.kr

감사합니다.`,
  },
  // PEA 예비 접수 완료 (KA01TP261004044330788K2YqGpY0AAe)
  waitlist_notice: {
    vars: ['신청자명', '신청번호', '신청차수', '예비번호'],
    body: `안녕하세요. 체육교육회입니다.

#{신청자명}님의 예비 신청이 접수되었습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
예비번호: #{예비번호}

추후 정원 편입 시 입금 안내드릴
예정입니다.

문의: 홈페이지 ‘1:1 문의’
www.pea2025.co.kr

감사합니다.`,
  },
  // PEA 예비접수 입금 안내 (KA01TP261004044604261DFFrJaTlq76)
  waitlist_deposit_notice: {
    vars: ['신청자명', '신청차수', '신청번호', '일정', '결제금액', '계좌정보', '입금기한', '입금자명'],
    body: `안녕하세요. 체육교육회입니다.

#{신청자명}님께서 #{신청차수} 
정원 편입되어 안내드립니다.

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

문의: 홈페이지 ‘1:1 문의’
www.pea2025.co.kr

감사합니다.`,
  },
  // PEA 입금확인 (KA01TP261004042707814Q0tN8tHytee)
  deposit_initial: {
    vars: ['신청자명', '신청번호', '신청차수', '일정', '확인금액', '참가상태'],
    body: `안녕하세요. 체육교육회입니다.

#{신청자명}님의 참가비 입금이 확인되었습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
확인금액: #{확인금액}원
참가상태: #{참가상태}

회차별 일정과 참가 안내는 홈페이지 공지사항을 확인해 주세요.

※ 환불 요청: 마이페이지
※ 요청 전 홈페이지 환불 규정 확인

문의: 홈페이지 ‘1:1 문의’
www.pea2025.co.kr

감사합니다.`,
  },
  // PEA 추가입금 안내 (KA01TP261004043105950Fmu5mNe0dCN)
  due_notice: {
    vars: ['신청자', '신청번호', '신청차수', '일정', '추가금액', '계좌정보', '추가결제금액', '입금기한'],
    body: `안녕하세요. 체육교육회입니다.

#{신청자}님의 신청내용 수정으로
추가납부 금액이 발생했습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
추가금액: #{추가금액}원
계좌정보: #{계좌정보}
추가결제금액: #{추가결제금액}원
입금기한: #{입금기한}

기한 내 추가금액을 입금해 주세요.

문의: 홈페이지 ‘1:1 문의’
www.pea2025.co.kr

감사합니다.`,
  },
  // PEA 추가입금 확인 (KA01TP261004043252072hposLJWEBPv)
  deposit_additional: {
    vars: ['신청자명', '신청번호', '신청차수', '일정', '추가금액', '총결제금액'],
    body: `안녕하세요. 체육교육회입니다.

#{신청자명}님의 추가입금이 확인되었습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
추가금액: #{추가금액}원
총결제금액: #{총결제금액}원

문의: 홈페이지 ‘1:1 문의’
www.pea2025.co.kr

감사합니다.`,
  },
  // PEA 환불접수 (KA01TP2610040435013229rOVkrNDHzb)
  refund_received: {
    vars: ['신청자명', '신청번호', '신청차수', '일정', '환불구분', '요청금액', '접수일'],
    body: `안녕하세요. 체육교육회입니다.

#{신청자명}님의 환불 요청이 접수되었습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
환불구분: #{환불구분}
요청금액: #{요청금액}원
접수일: #{접수일}

환불 규정에 따라 확인 후 처리하며, 완료 시 다시 안내드립니다.
최종 환불금액은 요청금액과 다를 수 있습니다.

문의: 홈페이지 ‘1:1 문의’
www.pea2025.co.kr

감사합니다.`,
  },
  // PEA 환불완료 (KA01TP261004043626135y1en89WTLwR)
  refund_completed: {
    vars: ['신청자명', '신청번호', '신청차수', '일정', '환불구분', '환불금액', '처리일'],
    body: `안녕하세요. 체육교육회입니다.

#{신청자명}님의 환불이 완료되었습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
환불구분: #{환불구분}
환불금액: #{환불금액}원
처리일: #{처리일}

입금 내역을 확인해 주세요.

문의: 홈페이지 ‘1:1 문의’
www.pea2025.co.kr

감사합니다.`,
  },
  // PEA 자동취소 (KA01TP261004043811412wlf4nRetFiH)
  auto_cancelled: {
    vars: ['신청자명', '신청번호', '신청차수', '일정', '취소일', '취소사유'],
    body: `안녕하세요. 체육교육회입니다.

#{신청자명}님의 참가 신청이 취소되었습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
취소일: #{취소일}
취소사유: #{취소사유}

문의: 홈페이지 ‘1:1 문의’
www.pea2025.co.kr

감사합니다.`,
  },
  // PEA 차수별 1주일 전 안내 (KA01TP261004044130789cmQlbI72rRQ)
  event_reminder: {
    vars: ['신청자명', '신청번호', '신청차수', '일정', '홈페이지차수별안내사항url주소'],
    body: `안녕하세요. 체육교육회입니다.

#{신청자명}님
행사 일정이 일주일 앞으로 다가왔습니다.

신청번호: #{신청번호}
신청차수: #{신청차수}
일정: #{일정}
안내사항 : 일정, 집결시간, 장소, 준비물 등
공지바로가기: #{홈페이지차수별안내사항url주소}

문의사항 : 홈페이지 내 ‘1:1 문의’ 이용
www.pea2025.co.kr

감사합니다.`,
  },
}

export type SmsVars = Record<string, string | null | undefined>

export interface Rendered {
  message: SmsMessage
  missing: string[] // 비어 있는 필수 변수 이름(#{} 표기 없이). 비어 있지 않으면 발송 보류.
}

// 변수 치환. 누락 변수는 #{이름} 그대로 남겨 보류 이력에서 어디가 비었는지 보이게 한다.
// variables = 솔라피에 보내는 값(필수 변수 전부, 누락은 빈 문자열 — 누락 건은 발송하지 않는다).
export function renderSms(kind: SmsKind, vars: SmsVars): Rendered {
  const t = SMS_TEMPLATES[kind]
  const val = (k: string) => (vars[k] ?? '').trim()
  const missing = t.vars.filter((k) => !val(k))
  const text = t.body.replace(/#\{([^}]+)\}/g, (all, k: string) => val(k) || all)
  const variables = Object.fromEntries(t.vars.map((k) => [k, val(k)]))
  return { message: { type: 'ATA', text, variables }, missing }
}

// 알림톡 본문 상한(카카오) — 변수 치환 후 1,000자.
export const ALIMTALK_MAX_CHARS = 1000

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
