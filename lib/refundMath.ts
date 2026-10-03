// 입금액·환불 계산 — 정산·대시보드·환불 입력·문자 공용(순수 함수, 클라·서버 겸용).
// 받은 돈 = 총액 − 미수 추가입금(due) + 수정 감액분.
//   수정 감액(옵션 취소)은 total_amount 에서 이미 빠지지만 실제로는 받았던 돈이고, 돌려준 금액은 환불 합계로 따로 빠진다.
//   (감액분을 total 과 환불액에서 두 번 빼지 않기 위함)
// 환불 합계(refunded_amount) = 완료된 환불 기록(refund_requests.status=completed) 금액의 합 — 서버가 확정·되돌리기 때마다 재계산.
export interface LedgerInput {
  total_amount: number
  due_amount: number | null
  refunded_amount: number | null
  mod_refund_amount: number // 수정 감액으로 생긴 환불 기록 금액 합(상태 무관 — 되돌린 수정의 미완료분은 삭제됨)
}

export function receivedAmount(a: LedgerInput): number {
  return (a.total_amount ?? 0) - (a.due_amount ?? 0) + (a.mod_refund_amount ?? 0)
}

// 입금확정 순매출 = 받은 돈 − 환불 합계.
export function netAmount(a: LedgerInput): number {
  return receivedAmount(a) - (a.refunded_amount ?? 0)
}

// 더 돌려줄 수 있는 금액(0 미만이면 0).
export function refundableAmount(a: LedgerInput): number {
  return Math.max(0, netAmount(a))
}
