-- ============================================================
-- 36_refund_paid_due_started.sql — 환불 지급액 칸 + 추가납부 시작 시각
--
-- 배경(2026-10-03 결정):
--   · 반복 부분환불 정산 오류 — 신청의 환불액(refunded_amount)을 확정 때마다 덮어쓰던 방식을
--     '완료된 환불 기록 지급액 합계'로 재계산하도록 변경. 요청액(amount)과 실제 지급액을 구분하려고 paid_amount 추가.
--   · 추가납부 연속 발생 — 부족분이 0 에서 처음 생긴 시각(due_started_at) + 7일을 기한으로 유지(추가 증액 시 연장 없음).
-- 영향: NULL 허용 열 2개 추가만. 기존 행·제약·RLS 변경 없음. 멱등.
-- 순서: 35 다음. 기존 데이터 점검·보정은 37_refunded_amount_check.sql.
--       이 SQL 전 배포여도 동작은 유지된다(지급액은 예전처럼 amount 에 기록, 기한은 안내 시각 기준).
-- ============================================================
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS paid_amount int;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS due_started_at timestamptz;

COMMENT ON COLUMN refund_requests.paid_amount IS '실제 환불 지급액(확정 시 기록). NULL 이면 amount 를 지급액으로 본다.';
COMMENT ON COLUMN applications.due_started_at IS '추가납부 부족분이 0 에서 처음 생긴 시각 — 추가입금 기한(+7일) 기준.';

-- 검증(읽기 전용):
--   SELECT table_name, column_name FROM information_schema.columns
--    WHERE (table_name='refund_requests' AND column_name='paid_amount') OR (table_name='applications' AND column_name='due_started_at');
-- 복구: ALTER TABLE refund_requests DROP COLUMN IF EXISTS paid_amount; ALTER TABLE applications DROP COLUMN IF EXISTS due_started_at;
