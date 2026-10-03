-- ============================================================
-- 35_sms_waitlist_notice.sql — 문자 종류에 예비접수 안내(waitlist_notice) 허용
--
-- 배경: 2026-10-03 클라이언트 회신 — 예비 신청 접수 시 별도 안내(금액·계좌·기한 없음).
-- 영향: sms_notifications.kind CHECK 교체(허용값 확대만). 기존 행·RLS 변경 없음. 멱등.
-- 순서: 34 다음. (31·34 를 새로 적용하는 경우 이미 같은 9종이라 같은 내용)
--       이 SQL 전에는 예비접수 안내 이력 저장이 CHECK 위반으로 실패 → 발송되지 않는다(안전 측). 다른 문자는 영향 없음.
-- ============================================================
ALTER TABLE sms_notifications DROP CONSTRAINT IF EXISTS sms_notifications_kind_check;
ALTER TABLE sms_notifications ADD CONSTRAINT sms_notifications_kind_check
  CHECK (kind IN ('deposit_notice','waitlist_notice','deposit_initial','due_notice','deposit_additional','refund_received','refund_completed','auto_cancelled','event_reminder'));

-- 검증(읽기 전용):
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'sms_notifications_kind_check';
-- 복구: 예비접수 안내 이력이 없을 때만 34 의 8종 CHECK 로 되돌릴 수 있다.
