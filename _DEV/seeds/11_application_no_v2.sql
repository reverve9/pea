-- 11_application_no_v2.sql — 신청번호 체계 개편(seed 07 대체).
-- 형식: {종목}{유형}-{YY}-{5자리}   예) SFP-27-00001 (스키·스노보드 자율패키지 2027 1번)
--   종목 S/T/W/E, 유형 CT(직무연수)/FP(자율패키지). 카운터는 (prefix, year) 단위 = 프로그램별 독립.
-- ⚠ 실행: Supabase SQL editor 1회. 실행 후 PostgREST 스키마 리로드(맨 아래 NOTIFY 포함).
--   앱 호출: supabaseAdmin.rpc('next_application_no', { p_prefix, p_year }).

-- 기존 연도전용 함수 폐기.
DROP FUNCTION IF EXISTS next_application_no(int);

-- 카운터를 (prefix, year) 복합키로 재구성. 프리론치 테스트 카운터는 초기화(발급된 번호 자체는 applications 에 그대로 남음).
TRUNCATE application_counters;
ALTER TABLE application_counters ADD COLUMN IF NOT EXISTS prefix text NOT NULL DEFAULT '';
ALTER TABLE application_counters DROP CONSTRAINT IF EXISTS application_counters_pkey;
ALTER TABLE application_counters ADD PRIMARY KEY (prefix, year);
ALTER TABLE application_counters ALTER COLUMN prefix DROP DEFAULT;

-- 원자적 발번 — (prefix, year) 행에 UPSERT 락. 동시 신청에도 시퀀스 중복 없음
-- (applications.application_no UNIQUE 이 최종 방어선).
CREATE OR REPLACE FUNCTION next_application_no(p_prefix text, p_year int) RETURNS text AS $$
DECLARE
  v_seq int;
BEGIN
  INSERT INTO application_counters (prefix, year, last_seq)
  VALUES (p_prefix, p_year, 1)
  ON CONFLICT (prefix, year) DO UPDATE SET last_seq = application_counters.last_seq + 1
  RETURNING last_seq INTO v_seq;

  -- YY = 연도 2자리, 5자리 시퀀스
  RETURN p_prefix || '-' || lpad((p_year % 100)::text, 2, '0') || '-' || lpad(v_seq::text, 5, '0');
END;
$$ LANGUAGE plpgsql;

NOTIFY pgrst, 'reload schema';
