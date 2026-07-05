-- 07_application_no.sql — 신청번호(application_no) 원자적 발번.
-- 형식: PEA-{연도}-{4자리 시퀀스}  예) PEA-2027-0042
-- 연도 기준 = 연수 시작연도(session.starts_on) — 제출 파이프라인(/api service_role)에서 넘겨준다.
-- 멱등: 테이블·함수 모두 CREATE ... IF NOT EXISTS / OR REPLACE. 재실행 안전.
-- 실행: Supabase SQL editor 에서 1회. (앱은 supabaseAdmin.rpc('next_application_no', { p_year }) 로 호출)

-- 연도별 카운터. service_role 만 접근(RLS 활성 + anon 정책 미생성).
CREATE TABLE IF NOT EXISTS application_counters (
  year     int PRIMARY KEY,
  last_seq int NOT NULL DEFAULT 0
);
ALTER TABLE application_counters ENABLE ROW LEVEL SECURITY;

-- 원자적 발번 — UPSERT 의 ON CONFLICT DO UPDATE 가 해당 연도 행에 락을 걸어
-- 동시 신청에도 시퀀스 중복이 없다(applications.application_no UNIQUE 이 최종 방어선).
CREATE OR REPLACE FUNCTION next_application_no(p_year int) RETURNS text AS $$
DECLARE
  v_seq int;
BEGIN
  INSERT INTO application_counters (year, last_seq)
  VALUES (p_year, 1)
  ON CONFLICT (year) DO UPDATE SET last_seq = application_counters.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN 'PEA-' || p_year::text || '-' || lpad(v_seq::text, 4, '0');
END;
$$ LANGUAGE plpgsql;
