-- ============================================================
-- 38_alimtalk.sql — 발송 수단을 솔라피 문자(SMS/LMS) → 카카오 알림톡(ATA)으로 전환 (2026-10-05)
--
-- 배경: 안내는 처음부터 알림톡이 목표였음. 대체문자는 보내지 않는다(disableSms).
-- 영향: msg_type CHECK 교체(허용값 'ATA' 추가만), kind CHECK 교체(waitlist_deposit_notice 추가만), NULL 허용 열 2개 추가.
--       기존 행·RLS·다른 테이블 변경 없음. 멱등(재실행 안전).
--   · template_id = 발송에 쓴 알림톡 템플릿 ID(KA01TP…)
--   · variables   = 알림톡 #{변수} 값 스냅샷(재발송도 같은 값). 기존 문자 이력은 NULL → 재발송 불가.
-- 순서: 31~37 다음. 이 SQL 전에는 알림톡 이력 저장이 실패 → 발송되지 않는다(안전 측).
-- ============================================================

ALTER TABLE sms_notifications ADD COLUMN IF NOT EXISTS template_id text;
ALTER TABLE sms_notifications ADD COLUMN IF NOT EXISTS variables jsonb;

ALTER TABLE sms_notifications DROP CONSTRAINT IF EXISTS sms_notifications_msg_type_check;
ALTER TABLE sms_notifications ADD CONSTRAINT sms_notifications_msg_type_check
  CHECK (msg_type IN ('SMS','LMS','ATA'));

-- 10번째 템플릿 '예비접수 입금 안내'(예비 → 정원 편입 시). 이전엔 편입 시 접수완료·입금안내(deposit_notice)를 보냈다.
ALTER TABLE sms_notifications DROP CONSTRAINT IF EXISTS sms_notifications_kind_check;
ALTER TABLE sms_notifications ADD CONSTRAINT sms_notifications_kind_check
  CHECK (kind IN ('deposit_notice','waitlist_notice','waitlist_deposit_notice','deposit_initial','due_notice','deposit_additional','refund_received','refund_completed','auto_cancelled','event_reminder'));

-- ============================================================
-- 검증(읽기 전용):
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name='sms_notifications' AND column_name IN ('template_id','variables');
--   SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname IN ('sms_notifications_msg_type_check','sms_notifications_kind_check');
-- 복구(알림톡 이력이 없을 때만): msg_type CHECK 를 ('SMS','LMS'), kind CHECK 를 35 의 9종으로 되돌리고 두 열 DROP.
-- ============================================================
