-- 05_inquiries_read.sql
-- 1:1 문의 읽기 인프라 — anon SELECT는 RLS로 막혀 있으므로(비밀글 보호):
--   (1) 안전 컬럼만 노출하는 리스트 뷰(본문·비번·연락처 제외)
--   (2) 열람용 비밀번호 검증 후 본문+답변 반환하는 RPC(security definer)
-- 적용: Supabase SQL Editor 새 쿼리 → 붙여넣기 → Run. 04(password_hash) 먼저 적용돼 있어야 함.

create extension if not exists pgcrypto with schema extensions;

-- (1) 리스트 뷰 — 작성자 이름(마스킹)·제목·상태·날짜. 본문/비번/연락처/원본이름은 제외. anon 읽기 허용.
create or replace view inquiries_public as
  select
    id,
    case
      when name is null or char_length(name) = 0 then null
      when char_length(name) = 1 then name
      when char_length(name) = 2 then left(name, 1) || '*'
      else left(name, 1) || repeat('*', char_length(name) - 2) || right(name, 1)
    end as name,
    title,
    status,
    created_at
  from inquiries;

grant select on inquiries_public to anon;

-- (2) 열람 RPC — 비번(raw) SHA-256 해시가 저장 해시와 일치할 때만 본문+답변 반환.
--     클라 INSERT 시 client SHA-256 hex로 저장 → 여기서도 동일 알고리즘으로 비교.
-- ⚠ Supabase는 pgcrypto가 extensions 스키마에 있어 digest를 스키마 명시(extensions.digest)로 호출.
create or replace function get_inquiry_secret(p_id uuid, p_password text)
returns table (title text, content text, status text, admin_reply text, created_at timestamptz)
language sql
security definer
set search_path = public, extensions
as $$
  select i.title, i.content, i.status, i.admin_reply, i.created_at
  from inquiries i
  where i.id = p_id
    and i.password_hash is not null
    and i.password_hash = encode(extensions.digest(p_password, 'sha256'), 'hex');
$$;

grant execute on function get_inquiry_secret(uuid, text) to anon;

-- 확인
select id, title, status, created_at::date from inquiries_public order by created_at desc;
