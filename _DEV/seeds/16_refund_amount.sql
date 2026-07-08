-- 16_refund_amount — 부분환불 금액(관리자 수기 설정)
-- 환불규정이 상황별로 달라 금액이 가변 → 자동 계산이 아니라 관리자가 설정한 금액을 환불(PG 환불도 동일).
-- 정산에서 순정산 = 입금확정매출 − refunded_amount − (가상계좌 가정 시)PG수수료.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS refunded_amount int NOT NULL DEFAULT 0;

COMMENT ON COLUMN applications.refunded_amount IS
  '환불 확정액(원). status=refunded 일 때만 유효. 관리자가 환불규정에 따라 수기 설정(부분환불 가능).';

-- 기존 더미/과거 refunded 건은 금액 미상 → 0 유지(관리자가 필요 시 재설정).
-- refunded_amount 는 관리자 설정값이 유일한 진실원천이므로 자동 백필하지 않는다.
