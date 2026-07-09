-- 22. 신청자 소속·지역 저장
-- 배경: 신청폼(직무/자율)에서 소속(school_name)·지역(region)을 필수로 수집·검증하지만
--   applications insert 에 컬럼이 없어 저장되지 않고 버려졌다(베타 지적). 대표 신청자 기준 1건.
-- 적용: Supabase SQL Editor 에서 1회 실행. 기존 신청 건은 NULL(수집 이력 없음).

alter table applications
  add column if not exists school_name text,
  add column if not exists region text;

comment on column applications.school_name is '신청 대표자 소속(자유 입력)';
comment on column applications.region is '신청 대표자 지역(REGIONS 상수 라벨)';
