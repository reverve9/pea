-- ============================================================
-- 체육교육회 Phase 1 — 02_seed_core.sql
-- 운영 필수 시드 (실데이터, 멱등)
--
-- 적용 방법: Supabase SQL Editor에서 01_schema.sql 실행 후 본 파일(02) 실행.
-- 멱등: 자연키(slug/key/(category,item_key)) 기준 ON CONFLICT DO NOTHING,
--       자연키 없는 sessions/faqs/notices 는 WHERE NOT EXISTS 로 중복 방지.
-- ⚠ 더미/테스트 데이터 없음(신청·참가자·게시글). 운영 실데이터만.
-- ============================================================

-- ------------------------------------------------------------
-- 1. courses — 종목·연수 과정
-- ------------------------------------------------------------
INSERT INTO courses (slug, name, course_type, sport, status, sort_order) VALUES
  ('jikmu-ski-snowboard', '교원 스키·스노보드 지도법 직무연수', 'jikmu', '스키·스노보드', 'open', 1),
  ('jayul-package',       '자율패키지',                         'jayul', '스키·스노보드', 'open', 2),
  ('tennis',              '테니스',                             'jayul', '테니스',       'preparing', 3),
  ('windsurfing',         '윈드서핑',                           'jayul', '윈드서핑',     'preparing', 4),
  ('exercise-prescription','운동처방',                          'jayul', '운동처방',     'preparing', 5)
ON CONFLICT (slug) DO NOTHING;

-- ------------------------------------------------------------
-- 2. sessions — 차수·일정 (course slug 로 course_id 참조)
--    중복 방지 키: (course_id, label)
-- ------------------------------------------------------------
INSERT INTO sessions (course_id, label, schedule_type, starts_on, ends_on, nights, capacity, sort_order)
SELECT c.id, v.label, v.schedule_type, v.starts_on::date, v.ends_on::date, v.nights, v.capacity, v.sort_order
FROM (VALUES
  -- 직무연수 (nights 2, capacity 15)
  ('jikmu-ski-snowboard', '직무 1차수',   'jikmu',       '2027-01-11', '2027-01-13', 2, 15,  1),
  -- 자율 주중2박 (nights 2, capacity 50) — 5개
  ('jayul-package',       '주중2박 1차수', 'weekday_2n',  '2027-01-03', '2027-01-05', 2, 50, 11),
  ('jayul-package',       '주중2박 2차수', 'weekday_2n',  '2027-01-10', '2027-01-12', 2, 50, 12),
  ('jayul-package',       '주중2박 3차수', 'weekday_2n',  '2027-01-17', '2027-01-19', 2, 50, 13),
  ('jayul-package',       '주중2박 4차수', 'weekday_2n',  '2027-01-24', '2027-01-26', 2, 50, 14),
  ('jayul-package',       '주중2박 5차수', 'weekday_2n',  '2027-01-31', '2027-02-02', 2, 50, 15),
  -- 자율 주말2박 (nights 2, capacity 50) — 3개
  ('jayul-package',       '주말2박 1차수', 'weekend_2n',  '2027-01-15', '2027-01-17', 2, 50, 21),
  ('jayul-package',       '주말2박 2차수', 'weekend_2n',  '2027-01-22', '2027-01-24', 2, 50, 22),
  ('jayul-package',       '주말2박 3차수', 'weekend_2n',  '2027-01-29', '2027-01-31', 2, 50, 23),
  -- 자율 주말1박 (nights 1, capacity 80) — 3개
  ('jayul-package',       '주말1박 1차수', 'weekend_1n',  '2027-01-16', '2027-01-17', 1, 80, 31),
  ('jayul-package',       '주말1박 2차수', 'weekend_1n',  '2027-01-23', '2027-01-24', 1, 80, 32),
  ('jayul-package',       '주말1박 3차수', 'weekend_1n',  '2027-01-30', '2027-01-31', 1, 80, 33)
) AS v(course_slug, label, schedule_type, starts_on, ends_on, nights, capacity, sort_order)
JOIN courses c ON c.slug = v.course_slug
WHERE NOT EXISTS (
  SELECT 1 FROM sessions s WHERE s.course_id = c.id AND s.label = v.label
);

-- ------------------------------------------------------------
-- 3. price_items — 단가 (확정가, 어드민 편집형)
--    재실행 시 admin 편집값 보존 위해 DO NOTHING.
-- ------------------------------------------------------------
INSERT INTO price_items (category, item_key, label, amount, sort_order) VALUES
  -- jikmu_base (1)
  ('jikmu_base',    'jikmu_base',  '직무연수 기본가',          303000, 1),
  -- rental (4)
  ('rental',        'apparel',     '의류 대여(스키복 상하의)',  30000, 11),
  ('rental',        'goggle',      '고글 대여',                20000, 12),
  ('rental',        'protector',   '보호대 대여',              20000, 13),
  ('rental',        'glove',       '장갑 구매',                15000, 14),
  -- room_surcharge (7) — 개별객실 추가요금, 2박 기준
  ('room_surcharge','room_22_4_1', '22평 4인실 1인 사용',     157500, 21),
  ('room_surcharge','room_22_4_2', '22평 4인실 2인 사용',     105000, 22),
  ('room_surcharge','room_22_4_3', '22평 4인실 3인 사용',      52500, 23),
  ('room_surcharge','room_33_5_1', '33평 5인실 1인 사용',     210000, 24),
  ('room_surcharge','room_33_5_2', '33평 5인실 2인 사용',     157000, 25),
  ('room_surcharge','room_33_5_3', '33평 5인실 3인 사용',     105000, 26),
  ('room_surcharge','room_33_5_4', '33평 5인실 4인 사용',      52500, 27),
  -- pkg_price 주중2박 (weekday_2n) (6)
  ('pkg_price',     'pkg_weekday_2n_1', '주중2박 1인',         437500, 31),
  ('pkg_price',     'pkg_weekday_2n_2', '주중2박 2인',         665000, 32),
  ('pkg_price',     'pkg_weekday_2n_3', '주중2박 3인',         892500, 33),
  ('pkg_price',     'pkg_weekday_2n_4', '주중2박 4인',        1120000, 34),
  ('pkg_price',     'pkg_weekday_2n_5', '주중2박 5인',        1400000, 35),
  ('pkg_price',     'pkg_weekday_2n_6', '주중2박 6인',        1680000, 36),
  -- pkg_price 주말2박 (weekend_2n) (6)
  ('pkg_price',     'pkg_weekend_2n_1', '주말2박 1인',         472000, 41),
  ('pkg_price',     'pkg_weekend_2n_2', '주말2박 2인',         700000, 42),
  ('pkg_price',     'pkg_weekend_2n_3', '주말2박 3인',         928000, 43),
  ('pkg_price',     'pkg_weekend_2n_4', '주말2박 4인',        1156000, 44),
  ('pkg_price',     'pkg_weekend_2n_5', '주말2박 5인',        1445000, 45),
  ('pkg_price',     'pkg_weekend_2n_6', '주말2박 6인',        1734000, 46),
  -- pkg_price 주말1박 (weekend_1n) (6)
  ('pkg_price',     'pkg_weekend_1n_1', '주말1박 1인',         300500, 51),
  ('pkg_price',     'pkg_weekend_1n_2', '주말1박 2인',         479000, 52),
  ('pkg_price',     'pkg_weekend_1n_3', '주말1박 3인',         657500, 53),
  ('pkg_price',     'pkg_weekend_1n_4', '주말1박 4인',         836000, 54),
  ('pkg_price',     'pkg_weekend_1n_5', '주말1박 5인',        1045000, 55),
  ('pkg_price',     'pkg_weekend_1n_6', '주말1박 6인',        1254000, 56)
ON CONFLICT (category, item_key) DO NOTHING;

-- ------------------------------------------------------------
-- 4. site_settings — key/value (value placeholder, 어드민에서 채움)
--    재실행 시 admin 입력값 보존 위해 DO NOTHING.
-- ------------------------------------------------------------
INSERT INTO site_settings (key, value) VALUES
  ('contact_email',   ''),
  ('contact_phone',   ''),
  ('deposit_bank',    ''),
  ('deposit_account', ''),
  ('deposit_holder',  ''),
  ('privacy_policy',  ''),
  ('terms',           ''),
  ('site_url',        'https://pea-ten.vercel.app')
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 5. site_contents — CMS 키 (본문은 placeholder/요약, 어드민에서 편집)
-- ------------------------------------------------------------
INSERT INTO site_contents (key, title, body, sort_order) VALUES
  ('intro_greeting',    '소개 및 인사말', '', 1),
  ('program_overview',  '주요 프로그램',   '', 2),
  ('training_overview', '연수 개요/비용 안내', '', 3),
  ('notes',             '참고사항',       '', 4),
  ('refund_policy',     '환불규정',
    '연수 시작 15일 전 전액 환불 / 8일 전 50% 환불 / 7일 이내 환불 불가', 5)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------
-- 6. faqs — 기본 2~3개 (is_published true)
--    중복 방지 키: question
-- ------------------------------------------------------------
INSERT INTO faqs (question, content, sort_order, is_published)
SELECT v.question, v.content, v.sort_order, true
FROM (VALUES
  ('입금자명이 신청자와 다른 경우 어떻게 하나요?',
   '신청서 작성 시 입금자명을 별도로 입력하실 수 있습니다. 입금자명이 신청자와 다르면 해당 칸에 실제 입금자명을 기재해 주세요.', 1),
  ('환불은 어떻게 진행되나요?',
   '환불규정에 따라 연수 시작 15일 전 전액, 8일 전 50% 환불되며 7일 이내에는 환불이 불가합니다. 환불 요청은 환불 신청 메뉴에서 접수해 주세요.', 2),
  ('보험은 가입되나요?',
   '연수 기간 동안 단체 상해보험에 가입됩니다. 보험 처리를 위해 신청 시 참가자 정보(생년월일 등)를 정확히 입력해 주세요.', 3)
) AS v(question, content, sort_order)
WHERE NOT EXISTS (
  SELECT 1 FROM faqs f WHERE f.question = v.question
);

-- ------------------------------------------------------------
-- 7. notices — 공지 1개 (is_published true)
--    중복 방지 키: title
-- ------------------------------------------------------------
INSERT INTO notices (title, content, category, is_published, published_at)
SELECT v.title, v.content, 'general', true, now()
FROM (VALUES
  ('신청 안내', '체육교육회 연수 신청 페이지입니다. 차수별 일정과 안내사항을 확인 후 신청해 주세요.')
) AS v(title, content)
WHERE NOT EXISTS (
  SELECT 1 FROM notices n WHERE n.title = v.title
);
