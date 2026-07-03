-- 04_alter_inquiries_password.sql
-- 1:1 문의 '열람용 비밀번호' 방식 도입 — inquiries에 password_hash 컬럼 추가.
-- 열람 = 작성 시 설정한 비밀번호로만(휴대폰 인증 불필요). 제출 시 해시 저장, 열람 시 서버라우트에서 검증.
-- 적용: Supabase SQL Editor 새 쿼리 → 붙여넣기 → Run. 멱등(IF NOT EXISTS).

alter table inquiries add column if not exists password_hash text;

comment on column inquiries.password_hash is '열람용 비밀번호 해시(작성자가 설정). 열람 시 service_role 서버라우트에서 검증. NULL이면 비번 미설정.';

-- 확인
select column_name, data_type, is_nullable
from information_schema.columns
where table_name = 'inquiries' and column_name = 'password_hash';
