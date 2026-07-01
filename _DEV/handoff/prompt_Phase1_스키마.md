# [Claude Code 구현 프롬프트] 체육교육회 — Phase 1: 스키마 + 운영 시드

## §0. 역할 / 산출물 형태

- 너는 이 레포에서 **SQL 파일을 생성·커밋**하는 역할이다. **DB에 직접 접근하지 않는다.**
- `supabase db push`, supabase CLI 적용, 직접 DB 연결, psql 실행 **전부 금지**. (Supabase 키도 없음)
- 산출물: `_DEV/seeds/` 폴더 안에 번호순 SQL 파일. 사람이 이 SQL을 **Supabase SQL Editor에 순서대로 붙여넣어 직접 실행**한다.
- 각 SQL 파일 **상단 주석에 적용 순서·방법** 명시 (예: `-- Supabase SQL Editor에서 01 → 02 순서로 실행`).
- 모든 SQL은 **멱등(idempotent)** 하게: `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, `DROP POLICY IF EXISTS` 후 `CREATE POLICY`, `CREATE INDEX IF NOT EXISTS` 등. 재실행해도 깨지지 않아야 한다.
- 무산축전 컨벤션 준수: `uuid` PK = `gen_random_uuid()`, `TIMESTAMPTZ` + `updated_at` 자동 갱신 트리거, status는 `TEXT` + `CHECK`, RLS 활성화.
- 설계 전체 맥락은 `체육교육회_설계문서_v1.md`(SoT) §3 을 따른다. 이 프롬프트가 그 구체화이며, 충돌 시 이 프롬프트 우선.

## §1. 생성할 파일

```
_DEV/seeds/
  01_schema.sql       # 테이블 + 인덱스 + 트리거 + RLS
  02_seed_core.sql    # 운영 필수 시드 (실데이터)
```
- **더미/테스트 데이터는 이번에 만들지 않는다.** (후속에 `03_seed_dummy.sql`로 별도 추가 예정. 지금은 생성 금지 — 운영 시드에 테스트 신청·게시글 섞지 말 것.)

---

## §2. `01_schema.sql` — 테이블 정의

설계문서 §3 의 표를 그대로 구현한다. 아래는 확정 스펙.

### 2-1. 공통
- 맨 위에 `updated_at` 자동 갱신 함수 1개:
  ```sql
  CREATE OR REPLACE FUNCTION update_updated_at() RETURNS TRIGGER AS $$
  BEGIN NEW.updated_at = now(); RETURN NEW; END; $$ LANGUAGE plpgsql;
  ```
- `updated_at` 컬럼 있는 모든 테이블에 `BEFORE UPDATE` 트리거 부착 (`DROP TRIGGER IF EXISTS` 후 생성).
- 모든 테이블 `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`. 변경되는 테이블은 `updated_at` 도 동일.

### 2-2. 테이블 목록 (컬럼·제약)

**courses** — 종목·연수 과정
- id uuid PK / slug text UNIQUE NOT NULL / name text NOT NULL
- course_type text NOT NULL CHECK (course_type IN ('jikmu','jayul'))
- sport text (스키/스노보드/테니스/윈드서핑/운동처방 등 자유값)
- status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','preparing','closed'))
- description text / thumbnail_url text / gallery_urls jsonb NOT NULL DEFAULT '[]'
- sort_order int NOT NULL DEFAULT 0 / is_active bool NOT NULL DEFAULT true
- created_at, updated_at

**sessions** — 차수·일정
- id uuid PK / course_id uuid NOT NULL REFERENCES courses(id) ON DELETE CASCADE
- label text NOT NULL
- schedule_type text NOT NULL CHECK (schedule_type IN ('weekday_2n','weekend_2n','weekend_1n','jikmu'))
- starts_on date NOT NULL / ends_on date NOT NULL
- nights int NOT NULL
- capacity int NOT NULL
- is_active bool NOT NULL DEFAULT true / sort_order int NOT NULL DEFAULT 0
- created_at, updated_at

**applications** — 신청 1건 = session 1개
- id uuid PK
- application_no text UNIQUE NOT NULL  ※ 발번 로직은 후속 Phase(무산 order_number 카운터 패턴). 이번엔 컬럼만, NOT NULL UNIQUE 제약만.
- session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE RESTRICT
- phone text NOT NULL  (정규화 11자리 저장 전제)
- applicant_name text NOT NULL / payer_name text
- room_type text CHECK (room_type IN ('group','private'))
- room_spec text / pkg_size int
- total_amount int NOT NULL DEFAULT 0
- price_breakdown jsonb NOT NULL DEFAULT '{}'
- status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','completed','cancelled','refunded'))
- deposit_confirmed_at timestamptz
- companion_memo text / special_notes text
- referral_source text[] NOT NULL DEFAULT '{}'
- privacy_agreed bool NOT NULL DEFAULT false / privacy_agreed_at timestamptz
- marketing_opt_in bool NOT NULL DEFAULT false
- admin_memo text
- created_at, updated_at

**participants** — 참가자 N명
- id uuid PK / application_id uuid NOT NULL REFERENCES applications(id) ON DELETE CASCADE
- name text NOT NULL
- gender text CHECK (gender IN ('male','female'))
- phone text
- lesson_level text
- rentals jsonb NOT NULL DEFAULT '{}'   (예: {"apparel_size":"L","goggle":true,"protector":false,"glove":true})
- birth_front text   (생년월일 앞 6자리)
- birth_back_enc text   ※ **보험용 주민번호 뒷자리 — 반드시 암호문만 저장.** 평문 저장 절대 금지. 실제 암복호화는 후속 Phase `/api`(service_role)에서 처리. 이번엔 컬럼만 생성하고, 평문이 들어가지 않도록 주석으로 경고.
- is_leader bool NOT NULL DEFAULT false
- sort_order int NOT NULL DEFAULT 0
- line_amount int NOT NULL DEFAULT 0
- created_at

**price_items** — 단가(어드민 편집형)
- id uuid PK
- category text NOT NULL CHECK (category IN ('jikmu_base','room_surcharge','pkg_price','rental'))
- item_key text NOT NULL
- label text NOT NULL
- amount int NOT NULL
- is_active bool NOT NULL DEFAULT true / sort_order int NOT NULL DEFAULT 0
- created_at, updated_at
- UNIQUE (category, item_key)

**게시판/요청 4종** (공통 패턴: phone, name, 본문, is_secret, status, admin_reply, created_at/updated_at)

- **refund_requests**: id uuid PK / application_id uuid REFERENCES applications(id) ON DELETE SET NULL / phone text NOT NULL / reason text / refund_account text / status text NOT NULL DEFAULT 'requested' CHECK (status IN ('requested','confirmed','completed')) / admin_memo text / created_at, updated_at
- **modification_requests**: id uuid PK / application_id uuid REFERENCES applications(id) ON DELETE SET NULL / phone text NOT NULL / content text / is_secret bool NOT NULL DEFAULT true / status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','done','rejected')) / admin_reply text / created_at, updated_at
- **inquiries** (일반문의): id uuid PK / phone text NOT NULL / name text / title text NOT NULL / content text NOT NULL / is_secret bool NOT NULL DEFAULT false / status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','answered')) / admin_reply text / created_at, updated_at
- **certificate_requests** (증명문의): id uuid PK / application_id uuid REFERENCES applications(id) ON DELETE SET NULL / phone text NOT NULL / name text / cert_type text CHECK (cert_type IN ('participation','payment','completion')) / is_secret bool NOT NULL DEFAULT true / status text NOT NULL DEFAULT 'processing' CHECK (status IN ('processing','done')) / file_url text / admin_reply text / created_at, updated_at

**notices** — 공지 (무산과 동일 구조)
- id uuid PK / title text NOT NULL / content text NOT NULL
- category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','program','result'))
- is_pinned bool NOT NULL DEFAULT false / is_published bool NOT NULL DEFAULT false / published_at timestamptz
- created_at, updated_at

**faqs**
- id uuid PK / question text NOT NULL / content text NOT NULL / sort_order int NOT NULL DEFAULT 0 / is_published bool NOT NULL DEFAULT true / created_at, updated_at

**site_contents** — CMS 페이지 콘텐츠
- id uuid PK / key text UNIQUE NOT NULL / title text / body text / images jsonb NOT NULL DEFAULT '[]' / sort_order int NOT NULL DEFAULT 0 / created_at, updated_at

**site_settings** — key-value 설정
- id uuid PK / key text UNIQUE NOT NULL / value text / created_at, updated_at

**phone_verifications** — OTP (실제 발송·검증은 후속 Phase, 컬럼만)
- id uuid PK / phone text NOT NULL / code_hash text NOT NULL / expires_at timestamptz NOT NULL / attempts int NOT NULL DEFAULT 0 / consumed_at timestamptz / created_at

**admins** — 관리자 로그인 (bcrypt)
- id uuid PK / username text UNIQUE NOT NULL / password_hash text NOT NULL / created_at, updated_at
- ※ 시드에 실제 관리자 계정 넣지 말 것(비밀번호 해시는 후속에 안전하게 생성·주입). 컬럼만.

**push_subscriptions** — PWA 푸시
- id uuid PK / phone text / endpoint text NOT NULL / keys jsonb NOT NULL DEFAULT '{}' / created_at
- UNIQUE (endpoint)

**alimtalk_logs** — 발송 감사로그
- id uuid PK / phone text / template text / payload jsonb NOT NULL DEFAULT '{}' / status text / created_at

### 2-3. 인덱스
- idx_sessions_course_id, idx_sessions_starts_on
- idx_applications_session_id, idx_applications_status, idx_applications_phone, idx_applications_created_at(DESC)
- idx_participants_application_id
- idx_price_items_category
- 각 요청 테이블의 phone / application_id / status
- idx_site_contents_key, idx_site_settings_key
- idx_phone_verifications_phone

### 2-4. RLS (설계문서 §3-7 — 잠근 채 유지)
모든 테이블 `ENABLE ROW LEVEL SECURITY`. 정책:
- **공개 SELECT(anon)**: courses, sessions, notices(단 is_published=true 권장), faqs(is_published=true), site_contents, site_settings, price_items(is_active=true).
- **공개 INSERT(anon)**: applications, participants, refund_requests, modification_requests, inquiries, certificate_requests, push_subscriptions, phone_verifications.
- **CMS/관리 테이블은 anon 쓰기 차단**: site_contents·site_settings·price_items·courses·sessions·notices·faqs·admins·alimtalk_logs 는 anon INSERT/UPDATE/DELETE 정책 만들지 말 것 (SELECT만 허용, 쓰기는 후속에 service_role `/api` 경유).
- **본인 조회 보호**: applications·participants·요청 4종의 민감 조회는 후속 Phase에서 OTP 게이트 + 쿼리 필터로 처리. 이번 RLS는 위 INSERT/SELECT 기본 정책까지만. (무산의 임시 all-true 정책은 도입 금지.)
- 정책명은 `<table>_select` / `<table>_insert` 형태로, `DROP POLICY IF EXISTS` 후 생성.

---

## §3. `02_seed_core.sql` — 운영 필수 시드 (실데이터, 멱등)

> INSERT는 충돌 시 무시되게: 자연키 있는 건 `ON CONFLICT (key/slug/(category,item_key)) DO NOTHING` 또는 `DO UPDATE`. courses/sessions 처럼 자연키 애매한 건 slug 기준으로.

### 3-1. courses
- `jikmu-ski-snowboard` — name '교원 스키·스노보드 지도법 직무연수', course_type 'jikmu', sport '스키·스노보드', status 'open', sort_order 1
- `jayul-package` — name '자율패키지', course_type 'jayul', sport '스키·스노보드', status 'open', sort_order 2
- 준비중(준비중 표기용, status 'preparing', sessions 없음):
  - `tennis` — '테니스', sport '테니스'
  - `windsurfing` — '윈드서핑', sport '윈드서핑'
  - `exercise-prescription` — '운동처방', sport '운동처방'

### 3-2. sessions  (course slug로 course_id 참조 — 서브쿼리 사용)
**직무연수** (course `jikmu-ski-snowboard`, schedule_type 'jikmu', nights 2, capacity 15):
- '1차수' 2027-01-11 ~ 2027-01-13

**자율 주중2박** (course `jayul-package`, schedule_type 'weekday_2n', nights 2, capacity 50): 5개
- 2027-01-03~01-05, 01-10~01-12, 01-17~01-19, 01-24~01-26, 01-31~02-02

**자율 주말2박** (schedule_type 'weekend_2n', nights 2, capacity 50): 3개
- 2027-01-15~01-17, 01-22~01-24, 01-29~01-31

**자율 주말1박** (schedule_type 'weekend_1n', nights 1, capacity 80): 3개
- 2027-01-16~01-17, 01-23~01-24, 01-30~01-31

label은 '1차수','2차수'… 또는 날짜 기반으로 일관되게.

### 3-3. price_items  (계획안 확정가 — 전부 실제값, placeholder 없음)
**jikmu_base**
- ('jikmu_base','jikmu_base','직무연수 기본가',303000)

**rental**
- ('rental','apparel','의류 대여(스키복 상하의)',30000)
- ('rental','goggle','고글 대여',20000)
- ('rental','protector','보호대 대여',20000)
- ('rental','glove','장갑 구매',15000)

**room_surcharge** (개별객실 추가요금, 2박 기준)
- ('room_surcharge','room_22_4_1','22평 4인실 1인 사용',157500)
- ('room_surcharge','room_22_4_2','22평 4인실 2인 사용',105000)
- ('room_surcharge','room_22_4_3','22평 4인실 3인 사용',52500)
- ('room_surcharge','room_33_5_1','33평 5인실 1인 사용',210000)
- ('room_surcharge','room_33_5_2','33평 5인실 2인 사용',157000)
- ('room_surcharge','room_33_5_3','33평 5인실 3인 사용',105000)
- ('room_surcharge','room_33_5_4','33평 5인실 4인 사용',52500)

**pkg_price — 주중2박 (weekday_2n)**
- 1인 437500 / 2인 665000 / 3인 892500 / 4인 1120000 / 5인 1400000 / 6인 1680000
- item_key: 'pkg_weekday_2n_1' … '_6'

**pkg_price — 주말2박 (weekend_2n)**
- 1인 472000 / 2인 700000 / 3인 928000 / 4인 1156000 / 5인 1445000 / 6인 1734000
- item_key: 'pkg_weekend_2n_1' … '_6'

**pkg_price — 주말1박 (weekend_1n)**
- 1인 300500 / 2인 479000 / 3인 657500 / 4인 836000 / 5인 1045000 / 6인 1254000
- item_key: 'pkg_weekend_1n_1' … '_6'

### 3-4. site_settings  (key/value — value는 placeholder, 어드민에서 채움)
- 'contact_email' → '' / 'contact_phone' → ''
- 'deposit_bank' → '' / 'deposit_account' → '' / 'deposit_holder' → ''
- 'privacy_policy' → '' / 'terms' → ''
- 'site_url' → 'https://pea-ten.vercel.app'

### 3-5. site_contents  (key + 빈/요약 본문 — 어드민에서 편집)
키만 잡아두기(본문은 placeholder 또는 계획안 요약 한두 줄):
- 'intro_greeting' (소개 및 인사말)
- 'program_overview' (주요 프로그램)
- 'training_overview' (연수 개요/비용 안내)
- 'notes' (참고사항)
- 'refund_policy' (환불규정 — 본문: 연수 시작 15일 전 전액 / 8일 전 50% / 7일 이내 불가)

### 3-6. faqs  (기본 2~3개, is_published true)
- 신청/입금 관련 일반 질문 2~3개를 plausible하게. (예: 입금자명이 다를 때 / 환불 절차 / 보험 가입)

### 3-7. notices
- 시드에 공지 1개만(선택). 'general', is_published true, 예: '신청 안내'. 없어도 무방.

---

## §4. 금지 사항
- **더미/테스트 데이터 생성 금지** (신청·참가자·게시글 더미 일절. 후속 `03_seed_dummy.sql`에서.)
- **DB 직접 적용·CLI 금지.** SQL 파일 생성·커밋만.
- **admins 실제 계정/비밀번호 시드 금지.** phone_verifications 시드 금지.
- **birth_back_enc 에 평문 저장 유도 금지** — 컬럼만, 경고 주석.
- 앱 코드(React/`/api`) 수정 금지 — 이번 Phase는 SQL만.
- 무산의 임시 all-true RLS 정책 도입 금지.

## §5. 커밋
- 메시지 예: `feat(db): Phase 1 schema + core seed SQL (_DEV/seeds)`.
- `_DEV/seeds/01_schema.sql`, `02_seed_core.sql` 만 변경. push.

## §6. 완료 보고에 포함
- 생성한 파일 경로/줄 수.
- 테이블 목록과 각 RLS 정책 요약(어느 테이블이 anon select/insert 가능한지 표로).
- price_items 시드 건수(= 1 + 4 + 7 + 18 = 30건) 확인.
- sessions 시드 건수(= 1 + 5 + 3 + 3 = 12건) 확인.
- **SQL Editor 적용 순서 안내**(01 → 02).
- 사람이 적용 후 검증할 쿼리 예시 몇 개(예: `select count(*) from price_items;` 등).
- 미해결/주의 사항.

## §7. 다음 블록 예고
- 완료 보고를 받으면 이 챗에서 **별도 검증 프롬프트**(SQL 적용 후 테이블·RLS·시드 건수 점검용 쿼리 모음)를 보낸다. 이 턴에서 자체 적용/검증은 하지 말 것 — SQL 생성·커밋까지만.
- 실제 적용은 Supabase 프로젝트가 Active 된 뒤 사람이 SQL Editor에서 수행한다. (현재 Supabase 다중 리전 장애로 프로젝트 생성 지연 중 — SQL 파일 작성에는 영향 없음.)
