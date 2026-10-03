-- ============================================================
-- 32_auto_cancel.sql — 입금기한 경과 자동취소 표시 열
--
-- 배경: 신청일(예비 승인 건은 승인일) KST 기준 +14일 23:59 까지 입금확인이 없으면 하루 1회 cron 이 취소.
--   · auto_cancelled_at  = 자동취소 시각. 관리자가 '재신청(취소 되돌리기)'으로 복구해도 남겨 두어 다시 자동취소하지 않는다.
--   · waitlist_released_at = 예비(정원 초과) 승인 시각. 승인 건의 입금기한 기준.
-- 영향: 열 추가만(NULL 허용, 기본값 없음). 기존 행·제약·RLS 변경 없음. 멱등.
-- 순서: 이 SQL 적용 전에는 cron 이 열 조회 실패로 아무것도 취소하지 않는다(안전 측).
-- ============================================================
ALTER TABLE applications ADD COLUMN IF NOT EXISTS auto_cancelled_at    timestamptz;
ALTER TABLE applications ADD COLUMN IF NOT EXISTS waitlist_released_at timestamptz;

COMMENT ON COLUMN applications.auto_cancelled_at IS '입금기한 경과 자동취소 시각. 복구 후에도 보존(재자동취소 방지).';
COMMENT ON COLUMN applications.waitlist_released_at IS '예비 승인(정원 편입) 시각 — 입금기한 기준.';

-- 검증(읽기 전용):
--   SELECT column_name, data_type, is_nullable FROM information_schema.columns
--    WHERE table_name='applications' AND column_name IN ('auto_cancelled_at','waitlist_released_at');
-- 복구: ALTER TABLE applications DROP COLUMN IF EXISTS auto_cancelled_at, DROP COLUMN IF EXISTS waitlist_released_at;
