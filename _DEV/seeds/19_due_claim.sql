-- ============================================================
-- 체육교육회 Phase 3 — 19_due_claim.sql  [초안 · 검토 후 실행]
-- 추가입금(due_amount) 고객 신고 수단 — 최초 입금확인요청(payment_claimed_at)과 별개 필드.
--
-- 배경: 수정 증액으로 발생한 due_amount(추가입금 대기)를 고객이 입금 후 "완료 알림"을 보낼 신호.
--   payment_claimed_at 은 최초 입금(pending) 신고용이라 이미 소비/무관 → due 전용 컬럼 분리.
-- 흐름: 고객이 마이페이지 due 배너에서 신고 → due_claimed_at 기록 →
--   어드민 통장 대조 후 confirmDuePayment → due_amount=0 + due_claimed_at=null(소비/해제).
-- 근거: 메모리 requests-reorg-modification-restructure §8(추가결제 신고), payment-claim-policy.
-- 멱등: IF NOT EXISTS. 배포 전 필수(마이/어드민 쿼리가 신규 컬럼 select).
-- ============================================================

ALTER TABLE applications ADD COLUMN IF NOT EXISTS due_claimed_at timestamptz;

-- due_settled_amount = confirmDuePayment 이 due_amount 를 0 으로 소비할 때 확정 금액을 보존.
--   되돌리기(revertDuePayment)로 due_amount 복원 가능하게 하는 마커 겸 금액. null=확정된 적 없음/되돌려짐.
--   정산 gross = total_amount − due_amount 는 그대로(확정되면 due_amount=0 → 전액 매출 계상). [[settlement-spec]]
ALTER TABLE applications ADD COLUMN IF NOT EXISTS due_settled_amount int;

-- 검증(수동): SELECT column_name FROM information_schema.columns
--             WHERE table_name='applications' AND column_name IN ('due_amount','due_claimed_at','due_settled_amount');
