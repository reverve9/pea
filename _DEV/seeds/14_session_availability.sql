-- 14_session_availability.sql — 공개(anon)용 회차 잔여 인원 집계 함수.
-- 사용자 앱(캘린더·신청폼)에서 잔여 인원을 보여주려면 회차별 점유 인원이 필요한데,
-- anon 은 RLS 상 applications 를 SELECT 할 수 없다(개인정보). → 집계 '수치만' 반환하는 SECURITY DEFINER 함수로 안전 노출.
-- 점유 기준 = is_waitlisted=false 이고 status ∈ (pending,paid,completed). (어드민 lib/capacity 와 동일 정책)
-- 반환은 카운트뿐(PII 없음). 멱등: CREATE OR REPLACE. 실행: Supabase SQL editor 1회.

create or replace function public.session_availability()
returns table (session_id uuid, capacity int, occupied int, remaining int)
language sql
stable
security definer
set search_path = public
as $$
  select
    s.id as session_id,
    s.capacity,
    coalesce(sum(coalesce(a.pkg_size, 1)) filter (
      where a.status in ('pending', 'paid', 'completed') and coalesce(a.is_waitlisted, false) = false
    ), 0)::int as occupied,
    greatest(
      s.capacity - coalesce(sum(coalesce(a.pkg_size, 1)) filter (
        where a.status in ('pending', 'paid', 'completed') and coalesce(a.is_waitlisted, false) = false
      ), 0),
      0
    )::int as remaining
  from sessions s
  left join applications a on a.session_id = s.id
  where s.is_active = true
  group by s.id, s.capacity;
$$;

grant execute on function public.session_availability() to anon, authenticated;
