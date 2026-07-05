-- 06_phone_digits.sql — 전화번호 대쉬 제거 정규화 + '숫자만' CHECK 제약.
-- 배경: 신청·문의 폼이 대쉬 없이 숫자만 입력받도록 통일(2026-07-05). applications.phone 은 이미 '정규화 11자리 저장 전제'.
-- 멱등: 데이터 정규화 UPDATE 는 반복 안전, CHECK 는 DO 블록으로 존재 확인 후 추가.
-- 실행: Supabase SQL editor 에서 1회. (앱 코드는 이미 입력단에서 \D 제거)

-- 1. 기존 데이터 정규화 — 비숫자(대쉬·공백 등) 제거. 라이브 데이터는 사실상 inquiries.
UPDATE inquiries    SET phone = regexp_replace(phone, '\D', '', 'g') WHERE phone ~ '\D';
UPDATE applications SET phone = regexp_replace(phone, '\D', '', 'g') WHERE phone ~ '\D';
UPDATE participants SET phone = regexp_replace(phone, '\D', '', 'g') WHERE phone IS NOT NULL AND phone ~ '\D';

-- 2. '숫자만' CHECK 제약(멱등). NULL 은 CHECK 통과하므로 nullable 컬럼도 안전.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'inquiries_phone_digits') THEN
    ALTER TABLE inquiries ADD CONSTRAINT inquiries_phone_digits CHECK (phone ~ '^[0-9]+$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'applications_phone_digits') THEN
    ALTER TABLE applications ADD CONSTRAINT applications_phone_digits CHECK (phone ~ '^[0-9]+$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'participants_phone_digits') THEN
    ALTER TABLE participants ADD CONSTRAINT participants_phone_digits CHECK (phone ~ '^[0-9]+$');
  END IF;
END $$;
