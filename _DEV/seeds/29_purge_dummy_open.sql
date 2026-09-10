-- ============================================================
-- 29_purge_dummy_open.sql — 오픈 전 더미 데이터 일괄 정리
--
-- 육안 확인용으로 넣어둔 시드 더미를 오픈 직전에 지운다. 실데이터는 건드리지 않는다.
--   · 공지 = 03_seed_dummy_notices.sql 로 들어간 8건(제목 일치분만)
--   · 신청 = SCT-27-% / SFP-27-% / PEA-% (참가자·현금영수증·증명서는 FK CASCADE,
--            요청은 더미 전화번호 0101111·0102222 로 별도 삭제)
-- ⚠ 실행 시점 = 오픈 직전 1회. 실행 후에는 어드민에서 실제 공지를 새로 작성한다.
-- ⚠ FAQ·요금·회차는 실데이터라 지우지 않는다.
--
-- 멱등: 없는 행은 그냥 0건 삭제.
-- ============================================================

-- 1) 더미 공지 (03_seed_dummy_notices.sql)
DELETE FROM notices WHERE title IN (
  '2026 동계 스키·스노보드 직무연수 신청 안내',
  '연수비 입금 계좌 안내',
  '홈페이지 리뉴얼 안내',
  '자율연수 패키지 운영 안내',
  '연수 취소·환불 규정 안내',
  '2025 동계 직무연수 수료자 발표',
  '강사진 소개 및 연수 커리큘럼 안내',
  '개인정보처리방침 개정 안내'
);

-- 2) 더미 신청 관련 요청(전화번호로 식별 — 신청 삭제 전에 먼저)
DELETE FROM refund_requests       WHERE phone LIKE '0101111%' OR phone LIKE '0102222%';
DELETE FROM modification_requests WHERE phone LIKE '0101111%' OR phone LIKE '0102222%';

-- 3) 더미 신청 (participants · cash_receipts · certificate_requests = FK CASCADE)
DELETE FROM applications
WHERE application_no LIKE 'SCT-27-%'
   OR application_no LIKE 'SFP-27-%'
   OR application_no LIKE 'PEA-%';

-- 4) 더미 문의(테스트로 남긴 게 있으면) — 비밀번호 테스트 글만 골라 지울 것.
--    실제 문의가 섞여 있을 수 있어 자동 삭제하지 않는다. 어드민 문의관리에서 눈으로 보고 지울 것.
-- DELETE FROM inquiries WHERE name IN ('테스트','test');

-- 확인
-- SELECT count(*) FROM notices;       -- 실제 공지만 남아야 함
-- SELECT count(*) FROM applications;  -- 0 이어야 함(오픈 전)
