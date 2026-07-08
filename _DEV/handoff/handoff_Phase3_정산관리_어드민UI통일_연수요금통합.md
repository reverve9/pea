# Handoff — Phase 3: 정산 관리 · 어드민 UI 통일 · 연수 요금 통합

작성 2026-07-08. 이 세션 = 정산 관리 신규 + 어드민 전반 UI 통일(테두리 제거·상단영역·날짜·리스트) + 연수 관리 요금 통합. 다음 세션은 "비교적 큰 작업들" 이어서.

**커밋 = `6ffdf1f`** (origin/main push 완료, 이전 `cd3aeaf`). 단일 커밋에 전부 포함.

## ⚠ 배포 전 필수 — DB 마이그레이션
`_DEV/seeds/16_refund_amount.sql` **Supabase에서 실행 필수.** `applications.refunded_amount int NOT NULL DEFAULT 0` 컬럼 추가.
- 안 하면 `getAllApplications`·`getSettlementData`가 이 컬럼을 select 하므로 **/admin/applications·/admin/settlements 500.**
- 실행 여부 미확인 → 다음 세션 착수 전 반드시 확인.

## 1) 정산 관리 (`/admin/settlements`) — 신규
스텁 → 완성. 스펙 = 메모리 [[settlement-spec]].
- 대상 = 입금확정(status paid/completed/refunded), 기준일 = `deposit_confirmed_at`.
- 순정산 = 입금확정매출 − 환불액. **무통장 고정**(mode='mudong', PG수수료 컬럼·토글 숨김). 엔진의 pgFee/SettlementMode는 유지 → 가상계좌는 나중에 토글+컬럼 복원만.
- 컨트롤 = 드롭다운 한 줄 필터(기간 YYMMDD~ · 기준[기간별·차수별·유형별] · [집계·건별명세]) + 엑셀 + 전체건수 + 페이지네이션.
- 건별명세 = 기준 축으로 정렬된 신청 명세(입금자명 불일치 빨강).
- 엔진 `lib/settlement.ts`(순수함수), 조회 `lib/adminQueries.getSettlementData`, 엑셀 `lib/excel.ts`(xlsx 의존성 추가, export 전용).
- 환불 = 관리자 수기 `refunded_amount`(가변, PG환불 동일). `applications/actions.setApplicationRefund` + 신청관리 상세 '환불완료'가 금액입력 모달(`RefundModal`). `setApplicationStatus`는 completed/refunded 전환 시 `deposit_confirmed_at` 보존하도록 수정(정산 기준일 유실 방지).

## 2) 어드민 UI 통일 (오너 강한 반복지시 — 메모리에 못박음)
- **테두리 전면 금지** [[no-borders-rule]] — 카드·박스·셀렉트·입력·포커스아웃라인 border 금지. 배경틴트·그림자·여백으로. globals.css `.admin-field:focus-visible{outline:none}` + `.admin-select`(appearance:none+셰브런). 공용 `adminFieldClass`/`adminSelectClass`(AdminToolbar). 리스트 카드=그림자로 교체(applications 제외 대부분). **아직 남음**: 모달 폼 인풋·버튼 border(notices/faqs/requests/inquiries/applications 모달, `app/admin/(panel)/page.tsx` 대시보드 카드, `components/admin/AdminStub.tsx`) → 다음 세션 일괄 정리 대상.
- **리스트 상단영역 통일** [[admin-ui-conventions]] — 공용 `components/admin/AdminListHeader`(틴트박스 좌:카운트/필터·우:액션·페이지네이션) + `AdminHeaderButton`(primary/secondary). 적용: faqs·notices·sessions·certificates. applications=AdminList·settlements=AdminToolbar(이미 동일 셸). `AdminList`에 exportButton prop 추가 + InlinePagination export.
- **날짜 필드 통일** — 공용 `components/admin/AdminDateField`. 입력 YYMMDD(250701), 표시 YY/MM/DD(슬래시 자동). 정산·연수모달 적용. 네이티브 date 금지.
- **무한스크롤 모달 금지·맥락필터** [[no-infinite-scroll-modals]] — 긴 세로나열 금지, 카테고리 아코디언+가로 2단. 기계적 전량나열 금지, 맥락에 맞는 것만.

## 3) 연수 관리(`/admin/sessions`) 요금 통합·리스트 재편 [[session-price-overrides]]
- **진짜 통합**: 차수 요금 오버라이드를 **차수 수정 모달에 흡수**(일정·정원+이 차수 요금 한 모달, 한 번 저장 = update/createSession→syncSessionOverrides). 별도 '요금' 버튼·SessionPriceModal 제거. `createSession`이 새 id 반환(개설 직후 오버라이드).
- 요금 = 2단 모달(좌 일정·정원/우 요금), 요금은 **카테고리 아코디언**, **유형이 실제 받는 항목만**(`relevantPriceItems`: 직무=기본가·객실·렌탈 / 자율=해당변형 pkg+렌탈). 금액은 기본가 **프리필**(흐린 placeholder 아님), 바꾸면 앰버 틴트+조정됨.
- 기본요금 = 헤더 버튼(전역 공통, BaseModal). BaseGrid Bundle도 접이식.
- **리스트 = 평면목록 + de-dup 컬럼**(헤더행 금지): 유형(직무연수/자율패키지 텍스트, 그룹 첫행) + 일정구분(주말2박 등 배지, 스케줄 그룹 첫행) + 회차. 정렬 직무→주말2박→주말1박→주중2박.

## 4) 증명서 발급(`/admin/certificates`)
신청관리와 동일 필터바로: 유형/회차/상태 셀렉트 + 이름·연락처 검색. `CertificateRosterRow`에 `kind` 추가.

## 신규/변경 파일
- 신규: `lib/settlement.ts`·`lib/excel.ts`, `components/admin/{AdminToolbar,AdminListHeader,AdminDateField}.tsx`, `app/admin/(panel)/settlements/SettlementsClient.tsx`, `_DEV/seeds/16_refund_amount.sql`
- 변경: settlements/page, applications(Client·actions), sessions(Client·BaseGrid·actions), certificates·faqs·notices·inquiries·requests Client, `components/admin/AdminList.tsx`, `lib/adminQueries.ts`·`lib/types.ts`, `app/globals.css`, package(xlsx)

## 다음 세션 (오너: "비교적 큰 작업들")
- (구체 목록 오너 지시 대기)
- 알려진 잔여: ① 모달 폼 인풋·버튼 border 일괄 제거(위 2번), ② 정산 가상계좌 수수료 토글 복원(결제수단 컬럼 도입 시), ③ 대시보드(`/admin`) 통계 이관/방향 [[admin-dashboard-deferred]].
- 검증: tsc·eslint 클린(경고는 기존 ScheduleCalendar만). dev=live Supabase.
