// 참가자 상세(사이즈·인적정보) 입력 마감 = 연수 시작 N일 전(렌탈 발주 리드타임).
// 마감 이후엔 셀프필·어드민 직접수정·대표 배정을 잠그고, 변경은 수정요청(감사 추적)으로만.
// 순수 함수만 — 클라이언트/서버 공용(날짜 문자열 'YYYY-MM-DD' 기준, 일 단위).

export const DETAIL_FILL_LEAD_DAYS = 10

// 'YYYY-MM-DD' → 로컬 자정 Date
function toDate(ymd: string): Date {
  return new Date(`${ymd}T00:00:00`)
}
function toYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}

// 연수 시작일(starts_on) → 입력 마감일 'YYYY-MM-DD' (시작 − LEAD_DAYS). 마감일 당일까지 입력 허용.
export function detailFillDeadline(startsOn: string): string {
  const d = toDate(startsOn)
  d.setDate(d.getDate() - DETAIL_FILL_LEAD_DAYS)
  return toYmd(d)
}

// 오늘이 마감을 지났는지(마감일 다음날부터 true). now 미지정 시 실행 시점 기준.
export function isDetailFillClosed(startsOn: string, now: Date = new Date()): boolean {
  return toYmd(now) > detailFillDeadline(startsOn)
}
