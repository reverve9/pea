-- ============================================================
-- 21_cash_receipt.sql — 현금영수증 발급 원장 + 신청 발급의도 컬럼 + 의무발행 토글
--
-- 배경: 비영리(고유번호증) 연수비 무통장입금. 교육/연수 = 현금영수증 의무발행 가능성↑,
--   10만원↑ 의무발급, 계좌이체=현금 포함, 면세여도 발급의무. 미발급 20% 가산세.
-- 트리거: 관리자의 무통장 입금확인(status→paid) 시 즉시 발급 / 환불 시 취소발급.
-- 발급수단: 대행 API(팝빌 등) 전제. ⚠ 실 API 콜은 후속(구조만) — lib/cashReceipt.ts 스텁.
--
-- 멱등(idempotent): 재실행해도 깨지지 않음.
-- ============================================================

-- ------------------------------------------------------------
-- 1. applications — 발급 "의도"(신청 시 1회 선택). 발급 "결과"는 cash_receipts 원장.
--    개인(소득공제)은 applications.phone 재사용 → 식별번호 별도저장 없음. 사업자만 bizno.
-- ------------------------------------------------------------
ALTER TABLE applications
  ADD COLUMN IF NOT EXISTS cash_receipt_type text NOT NULL DEFAULT 'none'
    CHECK (cash_receipt_type IN ('personal','business','none')),
  ADD COLUMN IF NOT EXISTS cash_receipt_bizno text;   -- 지출증빙(사업자)만. 숫자 10자리

-- ------------------------------------------------------------
-- 2. cash_receipts — 발급 원장(1 신청 : N 장)
--    원발급(kind='issue') + 추가입금분 발급 + 환불 취소발급(kind='cancel', ref_receipt_id).
--    면세 현금영수증: 공급가액 = 총액, 부가세 0. amount = 면세 총액.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cash_receipts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  kind           text NOT NULL DEFAULT 'issue' CHECK (kind IN ('issue','cancel')),
  ref_receipt_id uuid REFERENCES cash_receipts(id) ON DELETE SET NULL,  -- cancel → 원 발급건 참조(원 승인번호 참조 취소)
  purpose        text NOT NULL CHECK (purpose IN ('personal','business','self')),  -- 소득공제/지출증빙/자진발급
  identifier     text NOT NULL,  -- 개인 휴대폰 / 사업자번호 / 자진발급 010-000-1234
  amount         int  NOT NULL,  -- 면세 총액(공급가액=총액, 부가세 0)
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','issued','failed','cancelled')),
  approval_no    text,           -- 국세청 승인번호(팝빌 반환 or 홈택스 수기입력)
  raw            jsonb NOT NULL DEFAULT '{}',  -- 발급 API 응답/재시도 이력 스냅샷
  issued_at      timestamptz,
  cancelled_at   timestamptz,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

DROP TRIGGER IF EXISTS set_updated_at ON cash_receipts;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON cash_receipts FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE INDEX IF NOT EXISTS idx_cash_receipts_application_id ON cash_receipts(application_id);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_status         ON cash_receipts(status);
CREATE INDEX IF NOT EXISTS idx_cash_receipts_created_at     ON cash_receipts(created_at DESC);

-- RLS: anon 정책 미생성 — service_role(어드민 발급/조회)만. 세금원장(민감).
ALTER TABLE cash_receipts ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------
-- 3. 의무발행 토글 — 기본 ON(항상발급). 세무서가 비의무업종으로 확인해주면 'false'로 내려
--    '요청 시 발급'(발급 안 함 = 진짜 미발급 허용)으로 완화. 로직 재작성 없이 스위칭.
-- ------------------------------------------------------------
INSERT INTO site_settings (key, value) VALUES ('cash_receipt_mandatory', 'true')
  ON CONFLICT (key) DO NOTHING;
