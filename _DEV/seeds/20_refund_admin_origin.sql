-- ============================================================
-- 체육교육회 Phase 3 — 20_refund_admin_origin.sql  [초안 · 검토 후 실행]
-- 환불 경로 통일: 요청 없는 관리자 직접 환불도 refund_request 로 잡히게 origin='admin' 허용.
--
-- 배경: 모달 위 모달인 직접 환불(setApplicationRefund) 폐지 → 관리자 직접 환불도
--   refund_request(origin='admin', status='completed')로 등록(이력·마이페이지·되돌리기 통일).
--   폐강·비대면요청·중복입금 부분환불·재량 환불이 이 경로로 흡수.
-- 근거: 메모리 requests-reorg-modification-restructure.
-- 멱등: 제약 DROP/ADD. 배포 전 필수(registerAdminRefund 가 origin='admin' insert).
-- ============================================================

ALTER TABLE refund_requests DROP CONSTRAINT IF EXISTS refund_requests_origin_check;
ALTER TABLE refund_requests
  ADD CONSTRAINT refund_requests_origin_check CHECK (origin IN ('user','modification','admin'));

-- 검증(수동): SELECT DISTINCT origin FROM refund_requests;
