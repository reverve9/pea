-- 24. 환불요청 거절(rejected) 상태 추가
-- 배경: 어드민이 고객 환불요청을 '거절'할 수단이 없어, 0원 환불확정으로 우회해야만 요청이 목록에서 사라졌다(베타 지적).
--   refund_requests.status CHECK 에 'rejected'가 없어 거절 상태 저장이 불가했다.
-- 적용: Supabase SQL Editor 에서 1회 실행. 기존 데이터 영향 없음(제약만 확장).

alter table refund_requests drop constraint if exists refund_requests_status_check;
alter table refund_requests
  add constraint refund_requests_status_check
  check (status in ('requested', 'confirmed', 'completed', 'rejected'));
