-- 08_payment_claim.sql — 입금 확인 요청(신고) 컬럼.
-- 사용자가 마이페이지에서 "입금했어요" 신고 + 입금자 성명을 한 번 더 제공(신청 단계 payerDiffers 누락 백업).
-- ⚠ status 는 절대 안 바뀜(셀프 확정 금지) — 관리자만 통장 대조 후 paid 전환. 여기선 신고 시각·입금자명만 저장.
-- 멱등: ADD COLUMN IF NOT EXISTS. 실행: Supabase SQL editor 1회.

ALTER TABLE applications ADD COLUMN IF NOT EXISTS payment_claimed_at timestamptz; -- 신고 시각(1회)
ALTER TABLE applications ADD COLUMN IF NOT EXISTS payment_claim_name text;        -- 신고한 입금자 성명(회계 대조용)
