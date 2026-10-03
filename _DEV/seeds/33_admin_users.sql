-- ============================================================
-- 33_admin_users.sql — 어드민 계정(복수) 등록 테이블
--
-- 배경: 하드코딩 단일 계정(pea2026) → Supabase Auth 이메일 로그인 + admin_users 등록 계정만 통과(04_snowpass 방식).
--   · 로그인 비밀번호는 Supabase Auth 가 관리(앱·DB 에 비밀번호 저장 없음).
--   · admin_users 는 서버(service_role)만 읽는다. RLS 켜고 정책 없음 → anon/authenticated 접근 불가.
-- 영향: 테이블 신규 추가만. 기존 테이블·RLS 변경 없음. 멱등.
-- 순서: ① Supabase 대시보드 Authentication > Users > Add user 로 reverve9@naver.com·kimhs@hforce.co.kr 생성(Auto Confirm 체크)
--       ② 이 SQL 실행 → 두 계정 등록
--       ③ 앱 배포. (이 SQL 전에 배포하면 admin_users 조회 실패로 아무도 로그인할 수 없다 — 안전 측)
-- ============================================================
CREATE TABLE IF NOT EXISTS admin_users (
  user_id    uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  note       text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE admin_users ENABLE ROW LEVEL SECURITY;

COMMENT ON TABLE admin_users IS '어드민 로그인 허용 계정. 행 삭제 = 즉시 권한 회수.';

-- 초기 계정. auth.users 에 아직 없는 이메일은 건너뛴다(①을 먼저).
INSERT INTO admin_users (user_id, note)
SELECT u.id, v.note
FROM (VALUES ('reverve9@naver.com', 'main'), ('kimhs@hforce.co.kr', NULL)) AS v (email, note)
JOIN auth.users u ON lower(u.email) = v.email
ON CONFLICT (user_id) DO NOTHING;

-- 계정 추가(대시보드): Authentication 에서 사용자 생성 후 SQL Editor 에서
--   INSERT INTO admin_users (user_id, note)
--   SELECT id, '메모' FROM auth.users WHERE lower(email) = '추가할@이메일'
--   ON CONFLICT (user_id) DO NOTHING;
-- 권한 회수: DELETE FROM admin_users WHERE user_id = (SELECT id FROM auth.users WHERE lower(email) = '대상@이메일');

-- 검증(읽기 전용):
--   SELECT u.email, a.note, a.created_at FROM admin_users a JOIN auth.users u ON u.id = a.user_id ORDER BY a.created_at;
-- 복구: DROP TABLE IF EXISTS admin_users;
