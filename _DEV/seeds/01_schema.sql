-- ============================================================
-- 체육교육회 Phase 1 — 01_schema.sql
-- 테이블 + 인덱스 + updated_at 트리거 + RLS
--
-- 적용 방법: Supabase SQL Editor에서 01_schema.sql → 02_seed_core.sql 순서로 실행.
-- 본 파일은 멱등(idempotent): 재실행해도 깨지지 않음.
-- 무산축전 컨벤션: uuid PK = gen_random_uuid(), TIMESTAMPTZ, status TEXT+CHECK, RLS 활성.
-- ============================================================

-- ------------------------------------------------------------
-- 0. 공통: updated_at 자동 갱신 함수
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 1. 테이블 정의
-- ============================================================

-- courses — 종목·연수 과정
CREATE TABLE IF NOT EXISTS courses (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text UNIQUE NOT NULL,
  name          text NOT NULL,
  course_type   text NOT NULL CHECK (course_type IN ('jikmu','jayul')),
  sport         text,
  status        text NOT NULL DEFAULT 'open' CHECK (status IN ('open','preparing','closed')),
  description   text,
  thumbnail_url text,
  gallery_urls  jsonb NOT NULL DEFAULT '[]',
  sort_order    int NOT NULL DEFAULT 0,
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- sessions — 차수·일정
CREATE TABLE IF NOT EXISTS sessions (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id     uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  label         text NOT NULL,
  schedule_type text NOT NULL CHECK (schedule_type IN ('weekday_2n','weekend_2n','weekend_1n','jikmu')),
  starts_on     date NOT NULL,
  ends_on       date NOT NULL,
  nights        int NOT NULL,
  capacity      int NOT NULL,
  is_active     boolean NOT NULL DEFAULT true,
  sort_order    int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- applications — 신청 1건 = session 1개
CREATE TABLE IF NOT EXISTS applications (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_no     text UNIQUE NOT NULL,   -- 발번 로직은 후속 Phase(order_number 카운터 패턴). 이번엔 제약만.
  session_id         uuid NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT,
  phone              text NOT NULL,          -- 정규화 11자리 저장 전제
  applicant_name     text NOT NULL,
  payer_name         text,
  room_type          text CHECK (room_type IN ('group','private')),
  room_spec          text,
  pkg_size           int,
  total_amount       int NOT NULL DEFAULT 0,
  price_breakdown    jsonb NOT NULL DEFAULT '{}',
  status             text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','completed','cancelled','refunded')),
  deposit_confirmed_at timestamptz,
  companion_memo     text,
  special_notes      text,
  referral_source    text[] NOT NULL DEFAULT '{}',
  privacy_agreed     boolean NOT NULL DEFAULT false,
  privacy_agreed_at  timestamptz,
  marketing_opt_in   boolean NOT NULL DEFAULT false,
  admin_memo         text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- participants — 참가자 N명
CREATE TABLE IF NOT EXISTS participants (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE,
  name           text NOT NULL,
  gender         text CHECK (gender IN ('male','female')),
  phone          text,
  lesson_level   text,
  rentals        jsonb NOT NULL DEFAULT '{}',  -- 예: {"apparel_size":"L","goggle":true,"protector":false,"glove":true}
  birth_front    text,                          -- 생년월일 앞 6자리
  -- ⚠ birth_back_enc: 보험용 주민번호 뒷자리 — 반드시 "암호문"만 저장. 평문 저장 절대 금지.
  --   실제 암복호화는 후속 Phase /api(service_role)에서 처리. 이번엔 컬럼만.
  birth_back_enc text,
  is_leader      boolean NOT NULL DEFAULT false,
  sort_order     int NOT NULL DEFAULT 0,
  line_amount    int NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- price_items — 단가(어드민 편집형)
CREATE TABLE IF NOT EXISTS price_items (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category   text NOT NULL CHECK (category IN ('jikmu_base','room_surcharge','pkg_price','rental')),
  item_key   text NOT NULL,
  label      text NOT NULL,
  amount     int NOT NULL,
  is_active  boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (category, item_key)
);

-- refund_requests — 환불 요청
CREATE TABLE IF NOT EXISTS refund_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  phone          text NOT NULL,
  reason         text,
  refund_account text,
  status         text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','completed')),
  admin_memo     text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- modification_requests — 수정 요청
CREATE TABLE IF NOT EXISTS modification_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  phone          text NOT NULL,
  content        text,
  is_secret      boolean NOT NULL DEFAULT true,
  status         text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','done','rejected')),
  admin_reply    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- inquiries — 일반 문의
CREATE TABLE IF NOT EXISTS inquiries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone       text NOT NULL,
  name        text,
  title       text NOT NULL,
  content     text NOT NULL,
  is_secret   boolean NOT NULL DEFAULT false,
  status      text NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered')),
  admin_reply text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- certificate_requests — 증명 문의
CREATE TABLE IF NOT EXISTS certificate_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid REFERENCES applications(id) ON DELETE SET NULL,
  phone          text NOT NULL,
  name           text,
  cert_type      text CHECK (cert_type IN ('participation','payment','completion')),
  is_secret      boolean NOT NULL DEFAULT true,
  status         text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','done')),
  file_url       text,
  admin_reply    text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- notices — 공지
CREATE TABLE IF NOT EXISTS notices (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title        text NOT NULL,
  content      text NOT NULL,
  category     text NOT NULL DEFAULT 'general' CHECK (category IN ('general','program','result')),
  is_pinned    boolean NOT NULL DEFAULT false,
  is_published boolean NOT NULL DEFAULT false,
  published_at timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- faqs
CREATE TABLE IF NOT EXISTS faqs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question     text NOT NULL,
  content      text NOT NULL,
  sort_order   int NOT NULL DEFAULT 0,
  is_published boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- site_contents — CMS 페이지 콘텐츠
CREATE TABLE IF NOT EXISTS site_contents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text UNIQUE NOT NULL,
  title      text,
  body       text,
  images     jsonb NOT NULL DEFAULT '[]',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- site_settings — key-value 설정
CREATE TABLE IF NOT EXISTS site_settings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key        text UNIQUE NOT NULL,
  value      text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- phone_verifications — OTP (실제 발송·검증은 후속 Phase, 컬럼만)
CREATE TABLE IF NOT EXISTS phone_verifications (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text NOT NULL,
  code_hash  text NOT NULL,
  expires_at timestamptz NOT NULL,
  attempts   int NOT NULL DEFAULT 0,
  consumed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- admins — 관리자 로그인 (bcrypt). 실제 계정/해시 시드 금지 — 후속 Phase에서 안전 주입.
CREATE TABLE IF NOT EXISTS admins (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  username      text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- push_subscriptions — PWA 푸시
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text,
  endpoint   text NOT NULL,
  keys       jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);

-- alimtalk_logs — 발송 감사로그
CREATE TABLE IF NOT EXISTS alimtalk_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phone      text,
  template   text,
  payload    jsonb NOT NULL DEFAULT '{}',
  status     text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- 2. updated_at 트리거 (updated_at 컬럼 있는 테이블)
-- ============================================================
DROP TRIGGER IF EXISTS set_updated_at ON courses;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON sessions;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON applications;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON applications FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON price_items;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON price_items FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON refund_requests;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON refund_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON modification_requests;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON modification_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON inquiries;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON inquiries FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON certificate_requests;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON certificate_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON notices;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON notices FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON faqs;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON faqs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON site_contents;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON site_contents FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON site_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON site_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS set_updated_at ON admins;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON admins FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- 3. 인덱스
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_sessions_course_id              ON sessions(course_id);
CREATE INDEX IF NOT EXISTS idx_sessions_starts_on              ON sessions(starts_on);

CREATE INDEX IF NOT EXISTS idx_applications_session_id         ON applications(session_id);
CREATE INDEX IF NOT EXISTS idx_applications_status             ON applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_phone              ON applications(phone);
CREATE INDEX IF NOT EXISTS idx_applications_created_at         ON applications(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_participants_application_id     ON participants(application_id);

CREATE INDEX IF NOT EXISTS idx_price_items_category            ON price_items(category);

CREATE INDEX IF NOT EXISTS idx_refund_requests_phone          ON refund_requests(phone);
CREATE INDEX IF NOT EXISTS idx_refund_requests_application_id ON refund_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_refund_requests_status         ON refund_requests(status);

CREATE INDEX IF NOT EXISTS idx_modification_requests_phone          ON modification_requests(phone);
CREATE INDEX IF NOT EXISTS idx_modification_requests_application_id ON modification_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_modification_requests_status         ON modification_requests(status);

CREATE INDEX IF NOT EXISTS idx_inquiries_phone   ON inquiries(phone);
CREATE INDEX IF NOT EXISTS idx_inquiries_status  ON inquiries(status);

CREATE INDEX IF NOT EXISTS idx_certificate_requests_phone          ON certificate_requests(phone);
CREATE INDEX IF NOT EXISTS idx_certificate_requests_application_id ON certificate_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_certificate_requests_status         ON certificate_requests(status);

CREATE INDEX IF NOT EXISTS idx_site_contents_key       ON site_contents(key);
CREATE INDEX IF NOT EXISTS idx_site_settings_key       ON site_settings(key);
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone ON phone_verifications(phone);

-- ============================================================
-- 4. RLS — 모든 테이블 활성화
--   설계문서 §3-7: 잠근 채 유지. anon 정책은 아래 최소 SELECT/INSERT 까지만.
--   쓰기(CMS/관리)는 후속 Phase에서 service_role /api 경유.
-- ============================================================
ALTER TABLE courses               ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions              ENABLE ROW LEVEL SECURITY;
ALTER TABLE applications          ENABLE ROW LEVEL SECURITY;
ALTER TABLE participants          ENABLE ROW LEVEL SECURITY;
ALTER TABLE price_items           ENABLE ROW LEVEL SECURITY;
ALTER TABLE refund_requests       ENABLE ROW LEVEL SECURITY;
ALTER TABLE modification_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE inquiries             ENABLE ROW LEVEL SECURITY;
ALTER TABLE certificate_requests  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notices               ENABLE ROW LEVEL SECURITY;
ALTER TABLE faqs                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_contents         ENABLE ROW LEVEL SECURITY;
ALTER TABLE site_settings         ENABLE ROW LEVEL SECURITY;
ALTER TABLE phone_verifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE admins                ENABLE ROW LEVEL SECURITY;
ALTER TABLE push_subscriptions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE alimtalk_logs         ENABLE ROW LEVEL SECURITY;

-- 4-1. 공개 SELECT (anon)
DROP POLICY IF EXISTS courses_select ON courses;
CREATE POLICY courses_select ON courses FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS sessions_select ON sessions;
CREATE POLICY sessions_select ON sessions FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS price_items_select ON price_items;
CREATE POLICY price_items_select ON price_items FOR SELECT TO anon USING (is_active = true);

DROP POLICY IF EXISTS notices_select ON notices;
CREATE POLICY notices_select ON notices FOR SELECT TO anon USING (is_published = true);

DROP POLICY IF EXISTS faqs_select ON faqs;
CREATE POLICY faqs_select ON faqs FOR SELECT TO anon USING (is_published = true);

DROP POLICY IF EXISTS site_contents_select ON site_contents;
CREATE POLICY site_contents_select ON site_contents FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS site_settings_select ON site_settings;
CREATE POLICY site_settings_select ON site_settings FOR SELECT TO anon USING (true);

-- 4-2. 공개 INSERT (anon)
DROP POLICY IF EXISTS applications_insert ON applications;
CREATE POLICY applications_insert ON applications FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS participants_insert ON participants;
CREATE POLICY participants_insert ON participants FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS refund_requests_insert ON refund_requests;
CREATE POLICY refund_requests_insert ON refund_requests FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS modification_requests_insert ON modification_requests;
CREATE POLICY modification_requests_insert ON modification_requests FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS inquiries_insert ON inquiries;
CREATE POLICY inquiries_insert ON inquiries FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS certificate_requests_insert ON certificate_requests;
CREATE POLICY certificate_requests_insert ON certificate_requests FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS push_subscriptions_insert ON push_subscriptions;
CREATE POLICY push_subscriptions_insert ON push_subscriptions FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS phone_verifications_insert ON phone_verifications;
CREATE POLICY phone_verifications_insert ON phone_verifications FOR INSERT TO anon WITH CHECK (true);

-- 4-3. 정책 없음(anon 전면 차단, service_role 만 접근):
--   admins, alimtalk_logs — RLS 활성 + anon 정책 미생성.
--   applications/participants/요청4종/phone_verifications 의 anon SELECT 도 미생성
--   (본인 조회 보호는 후속 Phase OTP 게이트 + 쿼리 필터에서 처리).
--   CMS/관리 테이블(courses·sessions·notices·faqs·price_items·site_contents·site_settings)
--   은 위 SELECT 만 허용, anon INSERT/UPDATE/DELETE 정책 미생성.
