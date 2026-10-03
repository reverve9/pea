-- ============================================================
-- 34_sms_templates_v2.sql — 문자 8종(접수완료·추가입금 안내·1주일 전 안내 추가) + 차수별 안내 공지 연결
--
-- 배경: 2026-10-03 확정 문안 8종. 신규 종류 deposit_notice(접수완료·입금안내)·due_notice(추가입금 안내)·
--       event_reminder(차수 1주일 전 안내)를 sms_notifications.kind 에 허용하고,
--       #{공지URL} 용으로 차수 → 공지 연결(sessions.notice_id)을 둔다(연수 관리 화면에서 지정).
-- 영향: kind CHECK 교체(허용값 확대만), sessions 에 NULL 허용 열 추가. 기존 행·RLS 변경 없음. 멱등.
-- 순서: 31_sms_notifications.sql 다음. (31 을 새로 적용하는 경우 31 에 이미 8종이 들어 있어 CHECK 교체는 같은 내용)
--       이 SQL 전에는 신규 3종 문자 이력 저장이 CHECK 위반으로 실패 → 발송되지 않는다(안전 측).
--       notice_id 열이 없으면 1주일 전 안내는 #{공지URL} 누락으로 보류된다.
-- ============================================================
ALTER TABLE sms_notifications DROP CONSTRAINT IF EXISTS sms_notifications_kind_check;
ALTER TABLE sms_notifications ADD CONSTRAINT sms_notifications_kind_check
  CHECK (kind IN ('deposit_notice','waitlist_notice','deposit_initial','due_notice','deposit_additional','refund_received','refund_completed','auto_cancelled','event_reminder'));

ALTER TABLE sessions ADD COLUMN IF NOT EXISTS notice_id uuid REFERENCES notices(id) ON DELETE SET NULL;
COMMENT ON COLUMN sessions.notice_id IS '차수 안내 공지 — 1주일 전 안내 문자 #{공지URL}.';

-- 검증(읽기 전용):
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = 'sms_notifications_kind_check';
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'sessions' AND column_name = 'notice_id';
-- 복구: ALTER TABLE sessions DROP COLUMN IF EXISTS notice_id;
--       (kind CHECK 는 신규 3종 이력이 없을 때만 31 의 5종으로 되돌릴 수 있다)
