-- 13_application_waitlist.sql — 소프트 정원(오버부킹 대기) 컬럼.
-- 정책(오너 확정): 회차 정원(sessions.capacity)을 status ∈ (pending,paid,completed) 인원 합이 채운다.
--   제출 시점에 (현재 인원 + 이번 인원) > capacity 이면 거절하지 않고 is_waitlisted=true 로 '대기' 접수(소프트).
--   어드민이 대기 건을 승인(is_waitlisted=false 로 정원 편입) / 거절(status='cancelled') 한다.
-- ⚠ 소프트라 제출 동시성 락 불필요(경합 시 대기 몇 건 더 생길 뿐, 하드 초과 아님).
-- 멱등: ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS. 실행: Supabase SQL editor 1회.

ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS is_waitlisted boolean NOT NULL DEFAULT false; -- 정원 초과 접수분(대기)

COMMENT ON COLUMN applications.is_waitlisted IS '소프트 정원 대기 여부 — 제출 시 정원 초과면 true. 어드민 승인 시 false(정원 편입), 거절 시 status=cancelled.';

-- 회차별 신청인원 집계·대기 조회용 인덱스(정원 카운트가 매 제출/어드민 로드마다 (session_id, status) 로 스캔).
CREATE INDEX IF NOT EXISTS applications_session_status_idx
  ON applications (session_id, status);

-- 대기 건만 빠르게 뽑는 부분 인덱스(어드민 대기 목록).
CREATE INDEX IF NOT EXISTS applications_waitlisted_idx
  ON applications (session_id)
  WHERE is_waitlisted;
