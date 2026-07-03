-- 03_seed_dummy_notices.sql
-- 커뮤니티 공지사항 육안 확인용 더미(여러 개 + 카테고리·핀·요약 다양). 멱등: 같은 title 있으면 skip.
-- 적용: Supabase SQL Editor 새 쿼리 → 전체 붙여넣기 → Run. 재실행해도 중복 안 됨.
-- category: general(일반) / program(프로그램) / result(결과발표)

insert into notices (title, content, category, is_pinned, is_published, published_at)
select v.title, v.content, v.category, v.is_pinned, true, v.published_at
from (values
  ('2026 동계 스키·스노보드 직무연수 신청 안내',
   E'2026 동계 직무연수 신청을 시작합니다.\n\n신청 기간과 차수별 정원은 연수안내 페이지에서 확인해 주세요. 입금 확인 시 접수가 완료됩니다.',
   'program', true,  timestamptz '2026-01-26 09:00:00+09'),
  ('연수비 입금 계좌 안내',
   E'연수비 입금 계좌를 안내드립니다.\n\n입금자명은 반드시 신청자 본인 성함으로 해주시고, 입금 확인은 마이페이지에서 조회하실 수 있습니다.',
   'general', true,  timestamptz '2026-01-24 10:00:00+09'),
  ('홈페이지 리뉴얼 안내',
   E'체육교육회 홈페이지가 새롭게 단장했습니다.\n\n더욱 직관적인 UI와 다양한 정보로 찾아뵙겠습니다. 불편하신 점이나 건의사항은 언제든 문의해 주세요.',
   'general', false, timestamptz '2026-01-20 14:00:00+09'),
  ('자율연수 패키지 운영 안내',
   E'직무연수 외 자율연수 패키지(리프트권 포함/미포함)를 운영합니다.\n\n유형별 일정과 포함 내역은 연수안내 유형 섹션을 참고해 주세요.',
   'program', false, timestamptz '2026-01-15 11:00:00+09'),
  ('연수 취소·환불 규정 안내',
   E'연수 취소 시 환불은 규정에 따라 처리됩니다.\n\n개강 전 취소는 규정에 따라 환불되며, 개강 후에는 진행 일정에 따라 부분 환불될 수 있습니다.',
   'general', false, timestamptz '2026-01-12 09:30:00+09'),
  ('2025 동계 직무연수 수료자 발표',
   E'2025 동계 직무연수 수료자를 발표합니다.\n\n수료 여부와 NEIS 학점 반영 내역은 마이페이지에서 전화번호 인증 후 확인하실 수 있습니다.',
   'result', false, timestamptz '2026-01-05 16:00:00+09'),
  ('강사진 소개 및 연수 커리큘럼 안내',
   E'2026 동계 연수 강사진과 커리큘럼을 안내드립니다.\n\n종목별 세부 커리큘럼은 추후 순차 공개될 예정입니다.',
   'program', false, timestamptz '2025-12-28 10:00:00+09'),
  ('개인정보처리방침 개정 안내',
   E'개인정보처리방침이 일부 개정되었습니다.\n\n자세한 내용은 하단 개인정보처리방침에서 확인해 주세요.',
   'general', false, timestamptz '2025-12-20 09:00:00+09')
) as v(title, content, category, is_pinned, published_at)
where not exists (select 1 from notices n where n.title = v.title);

-- 확인
select category, count(*) from notices group by category order by category;
select title, is_pinned, published_at::date from notices order by is_pinned desc, published_at desc;
