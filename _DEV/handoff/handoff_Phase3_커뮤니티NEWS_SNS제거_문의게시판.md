# Handoff — 커뮤니티(나인브릿지 NEWS 이식) + SNS 전면제거 + 1:1 문의 게시판

작성 2026-07-03. 이전: 어드민 골격(`272ff2e`)·슬림푸터(`da790d8`). 이번 커밋은 이 문서와 함께 push.

## 0. 상태 / 실행순서 ⚠
- 커뮤니티 UI·SNS제거 = **코드 완료, 타입 통과, 전 페이지 200**.
- **DB 시드 실행 필요**(오너가 Supabase SQL Editor에서 수동 Run):
  1. `_DEV/seeds/03_seed_dummy_notices.sql` — 더미 공지 8개(핀2·카테고리 다양). **오너 실행함(추정)**.
  2. `_DEV/seeds/04_alter_inquiries_password.sql` — inquiries에 `password_hash` 컬럼. **문의 제출 전 필수**.
  3. `_DEV/seeds/05_inquiries_read.sql` — 리스트 뷰(`inquiries_public`, 이름 마스킹) + 열람 RPC(`get_inquiry_secret`). **05는 pgcrypto 스키마 이슈로 1차 실패 → `extensions.digest`로 수정함. 재Run 필요.**
- 05 미적용이어도 문의 리스트는 빈 목록으로 안전(에러 안 남).

## 1. 커뮤니티 재설계 (나인브릿지 PWANotice/ExtendedNotice 이식 + 커스터마이징)
셸: `app/community/page.tsx`(클라 오케스트레이터가 `AppShell` 직접 구성) + `layout.tsx`(패스스루). **병렬라우트 `@detail` 인터셉트 제거**(상태기반으로 이관), 공유·SEO용 풀페이지 `notices/[id]`는 자체 AppShell로 잔존.
- **좌(PWA) = 인덱스** `CommunityNewsList.tsx`: 섹션타이틀 2개 유지(공지사항 / 도움말·문의).
  - 공지 = **배경 위 divide-y 리스트(박스 없음)**, 제목·배지·날짜 + 1줄 요약. 페이지네이션(섹션타이틀 우측). 개별 공지 = 하위 항목.
  - 도움말·문의 = **동위 카드 3개**(FAQ / 1:1문의 / **내 신청·입금확인=마이페이지 솔리드카드 →/my**). 연수안내 톤(`bg-[#f2f5f9]`·`border-[#e5eaef]`·font-score 네이비).
- **우(Extended) = 콘텐츠** `CommunityDetailPanel.tsx`: 탭 없이 **세로 영역 스택**(공지/FAQ/문의), full SectionTitle. 좌 카드 클릭 → 해당 영역 점프.
  - 공지 `NoticeGroupAccordion.tsx`: **카테고리 그룹핑 없이 '다 묶은' 평면 아코디언**(카테고리=제목앞 배지), **싱글오픈+네이비 좌액센트 하이라이트**, 페이지네이션.
  - FAQ `FaqAccordion.tsx`: 컴팩트 아코디언, 페이지네이션.
- **페이지네이션 조건 통일**: 페이지당 데스크탑 5 / 모바일 3, ≤페이지크기면 숨김. 공용 `components/common/Pagination.tsx`(섹션 우측 상단). 공지·FAQ 좌우 페이지 공유(noticePage/faqPage in page.tsx).
- **모바일**: 카드 클릭 = 모달(공지 상세/FAQ/문의). `ModalShell` in page.tsx.
- 좌우 콘텐츠 여백 `px-8`. SectionTitle rail 색 `#9ca3af→#6b7280`(공용, 연수안내도 적용).

## 2. SNS 전면 제거 (올해 도입 계획 없음, 오너 지시)
- `ExtendedHeader.tsx`: SNS 칩박스 제거, **어드민 자물쇠 진입만 유지**(→/admin 새창). `sns` prop 삭제 → 호출부(courses/program/application/community notices[id]) `sns=`·`PLACEHOLDER_SNS` import 제거.
- `HomeExtended.tsx`: 우측 SNS 버튼 제거. `HomeFooter.tsx`: 푸터 SNS 아이콘 제거.
- `SNSLinks.tsx`·`PLACEHOLDER_SNS`는 파일만 잔존(재도입 대비, 미사용).

## 3. 1:1 문의 게시판 (작성 O / 열람 O · RLS 대응)
- **작성**: `lib/inquiries.ts` `createInquiry` — anon INSERT(RLS `inquiries_insert` 허용), 비번 **client SHA-256 hex → password_hash 저장**, `is_secret=true`. 폼=컨트롤드, 버튼 "제출"(연락처·제목·내용·비번 채우면 활성).
- **리스트**: `getInquiries` = `inquiries_public` 뷰(id·**마스킹이름**·title·status·created_at). 공지 스타일 divide-y + 페이지네이션(5/3). 행: 🔒 + 이름 + 제목 + 상태배지(답변완료/대기) + 날짜.
- **열람**: 행 클릭 → **인라인 비번 입력**(모달 아님, 중첩 회피) → `openInquiry`=RPC `get_inquiry_secret`(비번 검증) → 본문 + admin_reply.
- 열람 RPC는 서버(Postgres)에서 해시 비교 = anon SELECT 우회, 본문/연락처/원본이름 비노출.

## 4. 다음 세션 (오너: "수정할 것 있지만 다음 세션에서 이어감")
- **05 SQL 재Run 확인** → 문의 리스트·열람 실제 동작 육안 검증.
- 커뮤니티 **미세 수정 잔여**(오너 지정 예정) — 이번 세션 마지막에 언급만, 구체 항목 미확정.
- 백로그: 문의 **열람 서버라우트 강화**(현재 client SHA-256, 서버 해시로 승격 여지) / 어드민 문의 답변(admin_reply 쓰기) / 마이페이지(전화번호 OTP → 신청·입금확인).
- 로드맵([[pea-roadmap]]): 신청폼 → 어드민 세부 → 마이 → (커뮤니티 잔여).

## 5. 주의
- dev중 검증 = `npx tsc --noEmit`([[verify-with-tsc-when-dev-running]]).
- 어드민 인증=하드코딩 pea2026/pea2026!@([[admin-scope-criteria]]). 문의 열람=열람용 비밀번호(OTP 아님), 마이페이지만 OTP([[mypage-phone-otp]]).
- 카드 톤 통일 기준 = 연수안내 ScheduleMaster/CourseTypes(`bg-[#f2f5f9]`). white-box 아님(내가 처음 헷갈렸던 것).
