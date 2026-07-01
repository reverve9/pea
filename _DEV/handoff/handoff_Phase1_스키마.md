# 체육교육회 Phase 1 — 스키마 + 운영 시드 핸드오프 (SQL 작성 완료, DB 미적용)

작성일: 2026-06-30
원본 지시: `_DEV/handoff/prompt_Phase1_스키마.md`
커밋: `e6ee846` — `feat(db): Phase 1 schema + core seed SQL (_DEV/seeds)` (origin/main push 완료)

---

## 0. 상태

- **SQL 파일 생성·커밋·push 완료.** DB에는 **아직 적용 안 함**(Supabase 다중 리전 장애로 프로젝트 미생성).
- 적용은 Supabase Active 후 **사람이 SQL Editor에서 수동 실행** (프롬프트 §0/§7 지시).

## 1. 산출물

| 파일 | 줄 수 | 내용 |
|---|---|---|
| `_DEV/seeds/01_schema.sql` | 407 | 17 테이블 + 인덱스 + updated_at 트리거 13 + RLS(정책 15) |
| `_DEV/seeds/02_seed_core.sql` | 150 | courses 5, sessions 12, price_items 30, site_settings 8, site_contents 5, faqs 3, notices 1 |

- 둘 다 멱등(idempotent): 재실행해도 안전 (`IF NOT EXISTS`, `ON CONFLICT DO NOTHING`, `WHERE NOT EXISTS`, `DROP POLICY IF EXISTS`).
- 더미/테스트 데이터 없음. admins/phone_verifications 시드 없음. birth_back_enc 평문 없음(컬럼만 + 경고 주석).

## 2. 테이블 17개 + RLS(anon) 요약

| 테이블 | anon SELECT | anon INSERT | 비고 |
|---|:---:|:---:|---|
| courses | ✅ (all) | ✗ | CMS, 쓰기는 service_role |
| sessions | ✅ (all) | ✗ | |
| price_items | ✅ (is_active) | ✗ | |
| notices | ✅ (is_published) | ✗ | |
| faqs | ✅ (is_published) | ✗ | |
| site_contents | ✅ (all) | ✗ | |
| site_settings | ✅ (all) | ✗ | |
| applications | ✗ | ✅ | 본인조회는 후속 OTP 게이트 |
| participants | ✗ | ✅ | |
| refund_requests | ✗ | ✅ | |
| modification_requests | ✗ | ✅ | |
| inquiries | ✗ | ✅ | |
| certificate_requests | ✗ | ✅ | |
| push_subscriptions | ✗ | ✅ | |
| phone_verifications | ✗ | ✅ | |
| admins | ✗ | ✗ | service_role 전용 |
| alimtalk_logs | ✗ | ✗ | service_role 전용 |

- 정책명: `<table>_select` / `<table>_insert`. 모든 테이블 RLS 활성(17/17).

## 3. SQL Editor 적용 순서 (Supabase Active 후, 사람이 수행)

1. SQL Editor 새 쿼리 → `01_schema.sql` 전체 붙여넣기 → Run.
2. 새 쿼리 → `02_seed_core.sql` 전체 붙여넣기 → Run.
3. 아래 검증 쿼리로 점검.

## 4. 적용 후 확인 쿼리 (★ 별도 검증 프롬프트 없이 이걸로 확인)

```sql
-- 적용 후 확인용 (SQL Editor에 붙여넣기)
select count(*) from price_items;   -- 30 이어야 함
select count(*) from sessions;      -- 12 이어야 함
select count(*) from courses;       -- 5
select tablename from pg_tables where schemaname='public' order by 1;  -- 테이블 17개
```

(선택) 더 보고 싶을 때:
```sql
select category, count(*) from price_items group by category order by category;
--  jikmu_base 1 / pkg_price 18 / rental 4 / room_surcharge 7
select tablename, rowsecurity from pg_tables where schemaname='public' order by 1;  -- 전부 true
select tablename, policyname, cmd from pg_policies where schemaname='public' order by 1;  -- 15개
```

## 5. 다음 / 미해결

- **Supabase 프로젝트 Active 대기** (다중 리전 장애). Active 되면 위 §3 적용 → §4 검증.
- 후속 Phase 예정(이번 범위 밖): application_no 발번 카운터, OTP 발송·검증, 본인조회 OTP 게이트, admins 계정 안전 주입, birth_back_enc 암복호화(`/api` service_role), `03_seed_dummy.sql`(더미).
- **검증 프롬프트 없음** — 적용 후 위 §4 확인 쿼리(price_items 30 / sessions 12 / courses 5 / 테이블 17)로 마무리하기로 함.
