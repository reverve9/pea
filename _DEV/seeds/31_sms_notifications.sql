-- ============================================================
-- 31_sms_notifications.sql — 솔라피 문자 발송 이력(입금확인·환불접수·환불완료·입금기한 자동취소)
--
-- 배경: 관리자 수동 입금확인·환불 처리 후 신청자에게 SMS/LMS 안내. (알림톡·PG 연동은 범위 밖)
-- 원칙:
--   · dedupe_key UNIQUE = 같은 안내는 한 번만 등록(버튼 재클릭·중복 요청·상태 재저장·되돌림 후 재처리).
--     등록에 성공한 요청만 실제 발송한다 → 테이블이 없으면(미적용) 발송도 하지 않는다.
--   · 업무 저장(입금확인·환불) 성공 후에만 등록. 문자 실패는 업무 결과를 되돌리지 않는다.
--   · 이력은 삭제·덮어쓰지 않는다(상태 되돌림 후에도 보존). 신청 삭제 시 참조만 NULL.
--   · body = 실제 발송 문안 스냅샷(재발송도 같은 문안). 계좌번호 등은 문안에 넣지 않는다.
-- 상태: sending(외부 호출 중) → sent(솔라피 접수) | failed(미발송 확정, 재발송 가능)
--       | unknown(결과 불명확, 조회로 확인 전 재발송 금지) | held(설정 없음·비활성·허용번호 밖 → 미발송 보류, 재발송 가능)
-- 멱등: 재실행 안전(IF NOT EXISTS). 기존 테이블·데이터 변경 없음.
-- 실행: Supabase SQL Editor(또는 승인된 원격 적용 경로). update_updated_at() 함수는 01_schema 에 존재.
-- ============================================================

CREATE TABLE IF NOT EXISTS sms_notifications (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dedupe_key              text NOT NULL,
  kind                    text NOT NULL CHECK (kind IN ('deposit_initial','deposit_additional','refund_received','refund_completed','auto_cancelled')),
  application_id          uuid REFERENCES applications(id) ON DELETE SET NULL,
  refund_request_id       uuid REFERENCES refund_requests(id) ON DELETE SET NULL,
  recipient               text NOT NULL,          -- 숫자만(신청 phone 기준)
  msg_type                text NOT NULL CHECK (msg_type IN ('SMS','LMS')),
  subject                 text,                   -- LMS 제목
  body                    text NOT NULL,          -- 발송 문안 스냅샷
  status                  text NOT NULL CHECK (status IN ('sending','sent','failed','unknown','held')),
  attempts                int  NOT NULL DEFAULT 0 CHECK (attempts >= 0),  -- 시작된 외부 발송 시도 수
  provider_message_id     text,
  provider_group_id       text,
  provider_status_code    text,
  provider_status_message text,
  last_error              text,                   -- 오류 코드/사유(비밀값 미포함)
  sent_at                 timestamptz,
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT sms_notifications_dedupe_key_key UNIQUE (dedupe_key)
);

DROP TRIGGER IF EXISTS set_updated_at ON sms_notifications;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sms_notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_sms_notifications_application_id ON sms_notifications(application_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_refund_request  ON sms_notifications(refund_request_id);
CREATE INDEX IF NOT EXISTS idx_sms_notifications_status          ON sms_notifications(status);

-- RLS: anon 정책 미생성 — service_role(서버 액션·라우트)만 접근. 수신번호·이름 포함.
ALTER TABLE sms_notifications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 검증(읽기 전용):
--   SELECT column_name, data_type FROM information_schema.columns WHERE table_name='sms_notifications' ORDER BY ordinal_position;
--   SELECT relrowsecurity FROM pg_class WHERE relname='sms_notifications';          -- true
--   SELECT count(*) FROM pg_policies WHERE tablename='sms_notifications';           -- 0
--   SELECT conname FROM pg_constraint WHERE conrelid='sms_notifications'::regclass; -- dedupe UNIQUE 포함
-- 복구(필요 시, 이력 데이터도 삭제됨 — 별도 승인): DROP TABLE IF EXISTS sms_notifications;
-- ============================================================
