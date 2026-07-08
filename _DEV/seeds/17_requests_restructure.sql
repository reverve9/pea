-- ============================================================
-- 체육교육회 Phase 3 — 17_requests_restructure.sql  [초안 · 검토 후 실행]
-- 요청관리 해체 재편 + 수정요청 정형화 + 요금 엣지(추가결제 due_amount)
--
-- 근거: 메모리 requests-reorg-modification-restructure
-- 멱등(idempotent): 재실행 안전하도록 IF EXISTS / IF NOT EXISTS / 가드 DO 블록 사용.
-- 실행: Supabase SQL Editor. 배포 전 필수(어드민/마이 쿼리가 신규 컬럼 select).
-- ============================================================

-- ------------------------------------------------------------
-- 1) modification_requests — 자유텍스트 content → 정형 changes[]
-- ------------------------------------------------------------
-- changes = 변경 항목 배열(다중 참가자 대응). 각 원소:
--   {
--     "target":        "participant" | "application",
--     "participant_id":  uuid | null,      -- participant 대상일 때
--     "participant_name":"홍길동",          -- 표시용 스냅샷
--     "field":         "name"|"phone"|"birth_front"|"gender"
--                      |"lesson_level"|"equipment"
--                      |"rental_apparel"|"rental_protector"|"rental_goggle"|"rental_glove",
--     "label":         "연락처",            -- 표시 라벨
--     "current":       "010-1111-2222",     -- 요청 시점 현재값 스냅샷
--     "requested":     "010-3333-4444"      -- 변경 희망값(빈 값=유지 안 씀; 항목 자체가 변경분만 담김)
--   }
-- ⚠ 차수(session) 변경은 대상 아님 — 취소 후 재신청.
ALTER TABLE modification_requests ADD COLUMN IF NOT EXISTS changes       jsonb NOT NULL DEFAULT '[]';
ALTER TABLE modification_requests ADD COLUMN IF NOT EXISTS user_note     text;   -- 고객 특이사항(보조 자유텍스트)
ALTER TABLE modification_requests ADD COLUMN IF NOT EXISTS internal_note text;   -- 어드민 내부메모(고객 미표시)

-- 기존 자유텍스트 content → user_note 이관 후 content 제거(가드).
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_name='modification_requests' AND column_name='content') THEN
    UPDATE modification_requests SET user_note = COALESCE(user_note, content) WHERE content IS NOT NULL;
    ALTER TABLE modification_requests DROP COLUMN content;
  END IF;
END $$;

-- status 3단 단순화: pending / completed / rejected (기존 confirmed·done 정리).
UPDATE modification_requests SET status = 'completed' WHERE status = 'done';
UPDATE modification_requests SET status = 'pending'   WHERE status = 'confirmed';
ALTER TABLE modification_requests DROP CONSTRAINT IF EXISTS modification_requests_status_check;
ALTER TABLE modification_requests
  ADD CONSTRAINT modification_requests_status_check
  CHECK (status IN ('pending','completed','rejected'));

-- ------------------------------------------------------------
-- 2) refund_requests — 부분환불 자동연동 지원
-- ------------------------------------------------------------
-- amount  = 요청/예상 환불액. 수정으로 인한 부분환불이면 차액이 채워짐(수기 환불은 null 가능).
-- origin  = 'user'(고객 환불신청) | 'modification'(수정 감액 자동생성).
-- modification_request_id = 자동생성 출처 추적(선택).
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS amount int;
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS origin text NOT NULL DEFAULT 'user';
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS modification_request_id uuid
  REFERENCES modification_requests(id) ON DELETE SET NULL;
ALTER TABLE refund_requests DROP CONSTRAINT IF EXISTS refund_requests_origin_check;
ALTER TABLE refund_requests
  ADD CONSTRAINT refund_requests_origin_check CHECK (origin IN ('user','modification'));

-- ------------------------------------------------------------
-- 3) applications — 추가결제 부족분
-- ------------------------------------------------------------
-- due_amount = 수정 증액으로 발생한 추가 입금 대기액. base status=paid 유지(정산 보호),
--   마이페이지 표시만 '입금대기(추가)'. 부족분 입금확인 시 total 갱신 + due_amount=0.
ALTER TABLE applications ADD COLUMN IF NOT EXISTS due_amount int NOT NULL DEFAULT 0;

-- ============================================================
-- 검증 쿼리(수동 확인용, 실행 영향 없음)
--   SELECT column_name FROM information_schema.columns WHERE table_name='modification_requests';
--   SELECT column_name FROM information_schema.columns WHERE table_name='refund_requests';
--   SELECT column_name FROM information_schema.columns WHERE table_name='applications' AND column_name IN ('due_amount','refunded_amount');
-- ============================================================
