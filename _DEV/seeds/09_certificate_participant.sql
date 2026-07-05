-- 09_certificate_participant.sql
-- 증명서 발급 원장(certificate_requests)에 참가자 연결.
-- 수료증은 참가자 1인 1장 → participant_id 로 개인 단위 발급/조회. 발급현황 = 연수완료 신청의 참가자 × 발급 원장.
-- ⚠ 실행 후 PostgREST 스키마 리로드 필요:  NOTIFY pgrst, 'reload schema';

ALTER TABLE certificate_requests
  ADD COLUMN IF NOT EXISTS participant_id uuid REFERENCES participants(id) ON DELETE CASCADE;

-- 같은 참가자에게 같은 종류 증명서 중복 발급 방지(수료증 1장 보장).
CREATE UNIQUE INDEX IF NOT EXISTS certificate_requests_participant_type_uniq
  ON certificate_requests (participant_id, cert_type)
  WHERE participant_id IS NOT NULL;

NOTIFY pgrst, 'reload schema';
