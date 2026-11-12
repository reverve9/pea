import { netAmount, receivedAmount, type LedgerInput } from '../refundMath'

// 이체확인서 — 마이페이지 출력용 값 계산(순수 함수, 클라·서버 겸용).
// 양식 원본: _ref/체육교육회 참가 및 납부확인서 (양식).pdf (2026-11-12 수령).
// 발급 = 입금확인(paid)·연수완료(completed) + 추가입금 미납 없음 + 순납부액 > 0. 직무·자율 공통.
// 프로그램명(클라이언트 지정 2026-11-12): 직무 = '직무연수', 자율 = '자율패키지_주말2박_1차수' 형식.
// 금액 = 순납부액(받은 돈 − 환불 합계). 환불이 있으면 특이사항에 표기. 자율패키지 2명 이상이면 인원 표기(직무는 표기 안 함).

export const PAY_CONFIRM = {
  org: '체육교육회',
  title: '이체 확인서', // 클라이언트 지정(2026-11-12): 양식 제목 '납부 확인서' → '이체 확인서'
  place: '알펜시아 리조트',
  method: '은행 계좌이체',
  notice: '※ 본 확인서는 참가사실 및 입금(납부) 확인을 위한 자료로 발급됩니다.',
} as const

export type PayConfirmBlock = 'status' | 'due' | 'amount' | 'session'

// 마이페이지 안내 문구(발급 불가 사유).
export const PAY_CONFIRM_BLOCK_TEXT: Record<PayConfirmBlock, string> = {
  status: '이체확인서는 입금 확인 후 발급됩니다.',
  due: '추가 입금 확인 후 이체확인서가 발급됩니다.',
  amount: '납부 금액이 없어 이체확인서를 발급할 수 없습니다.',
  session: '연수 일정 정보가 없어 이체확인서를 발급할 수 없습니다.',
}

export interface PayConfirmSource {
  scheduleType: string // sessions.schedule_type: jikmu | weekday_2n | weekend_2n | weekend_1n
  status: string
  sessionLabel: string | null
  startsOn: string | null // 'YYYY-MM-DD'
  endsOn: string | null
  applicantName: string
  payerName: string | null
  headcount: number
  ledger: LedgerInput
}

export interface PayConfirmDoc {
  programName: string
  period: string
  place: string
  note: string
  amount: number
  amountText: string
  payerName: string
  method: string
  issuedText: string
  org: string
}

const won = (n: number) => n.toLocaleString('ko-KR') + '원'
const pad = (n: number) => String(n).padStart(2, '0')
const WEEK = '일월화수목금토'

// 화면(목록) 단계 판정 — 금액 없이 상태만. 서버는 payConfirmBlock 으로 금액까지 다시 본다.
export function payConfirmStatusBlock(a: { status: string; due_amount: number }): PayConfirmBlock | null {
  if (a.status !== 'paid' && a.status !== 'completed') return 'status'
  if ((a.due_amount ?? 0) > 0) return 'due'
  return null
}

export function payConfirmBlock(s: PayConfirmSource): PayConfirmBlock | null {
  const b = payConfirmStatusBlock({ status: s.status, due_amount: s.ledger.due_amount ?? 0 })
  if (b) return b
  if (!s.startsOn || !s.endsOn) return 'session'
  if (netAmount(s.ledger) <= 0) return 'amount'
  return null
}

const JAYUL_SCHEDULE: Record<string, string> = { weekday_2n: '주중2박', weekend_2n: '주말2박', weekend_1n: '주말1박' }

// 직무 → '직무연수'. 자율 → '자율패키지_<일정>_<N>차수' (회차명 '주말2박 1차수' 의 숫자 사용).
// 회차명에 숫자가 없거나 일정 구분을 모르면 회차명 단어를 '_'로 이어 붙인다.
export function programName(scheduleType: string, label: string | null): string {
  if (scheduleType === 'jikmu') return '직무연수'
  const raw = (label ?? '').trim()
  const m = raw.match(/(\d+)\s*(?:차수|차|기)/)
  const sched = JAYUL_SCHEDULE[scheduleType]
  if (sched && m) return `자율패키지_${sched}_${Number(m[1])}차수`
  return ['자율패키지', ...raw.split(/\s+/).filter(Boolean)].join('_')
}

// '2026-01-11' → '2026. 01. 11. (일)'
export function formatDay(ymd: string): string {
  const [y, m, d] = ymd.slice(0, 10).split('-').map(Number)
  const w = WEEK[new Date(Date.UTC(y, m - 1, d)).getUTCDay()]
  return `${y}. ${pad(m)}. ${pad(d)}. (${w})`
}

// 발급일 = 출력 시점의 한국 날짜 → '2026년 1월 14일'
export function issuedText(now: Date): string {
  const k = new Date(now.getTime() + 9 * 3600 * 1000)
  return `${k.getUTCFullYear()}년 ${k.getUTCMonth() + 1}월 ${k.getUTCDate()}일`
}

export function buildPayConfirm(s: PayConfirmSource, now: Date): PayConfirmDoc {
  const net = netAmount(s.ledger)
  const refunded = s.ledger.refunded_amount ?? 0
  const notes: string[] = []
  if (s.scheduleType !== 'jikmu' && s.headcount > 1) notes.push(`참가 인원 ${s.headcount}명`)
  if (refunded > 0) notes.push(`환불 ${won(refunded)} 반영 (입금 ${won(receivedAmount(s.ledger))})`)
  return {
    programName: programName(s.scheduleType, s.sessionLabel),
    period: s.startsOn && s.endsOn ? `${formatDay(s.startsOn)} ~ ${formatDay(s.endsOn)}` : '',
    place: PAY_CONFIRM.place,
    note: notes.join(' · '),
    amount: net,
    amountText: won(net),
    payerName: (s.payerName ?? '').trim() || s.applicantName,
    method: PAY_CONFIRM.method,
    issuedText: issuedText(now),
    org: PAY_CONFIRM.org,
  }
}
