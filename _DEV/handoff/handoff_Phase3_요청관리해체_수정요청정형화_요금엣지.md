# Handoff — Phase 3: 요청관리 해체 · 수정요청 정형화 · 요금 엣지케이스

작성 2026-07-08(설계) → **2026-07-09 구현 완료·커밋.** 근거·최종결정 = 메모리 `requests-reorg-modification-restructure`(설계 후 오너 지시로 다수 조정됨 — 아래 '구현 결과' 우선). 정산 = `settlement-spec`, 렌탈 = `rental-model`.

## ✅ 구현 결과 (설계와 달라진 점 = 최종본)
- **seed 17·18 실행 필수**(오너 반영 완료). 17=정형화 스키마+due_amount, 18=신규 더미(직무5+자율10, 엣지 전부).
- **세그먼트 없음**(설계의 [신청][수정][환불] 3세그먼트 폐기) → 신청 **단일 목록** + 요청 **배지 컬럼**(수정=navy / 부분환불·환불=amber, origin별) + **요청 필터**(전체/수정/환불) + **상세 '들어온 요청' 섹션**에서 확인·처리(수정 diff→반영/반려, 환불 인라인 금액확정). RequestPanels.tsx는 만들었다 제거.
- **입금확인요청** = 큰 박스→컴팩트 한 줄(배지+입금자명+불일치+해제 링크). 개별 완료/상태변경은 스테퍼.
- **추가입금(due) 차별화**: due>0=paid에서만 발생. 목록 상태셀 단일 **'추가입금 대기'(orange)** 배지(입금확인+추가입금 병기 아님), '입금대기' 필터가 pending+due 둘 다 잡음. 상세=부족분+`confirmDuePayment` 액션. 마이='입금대기(추가)'. 정산 gross=total−due.
- **예비 박스** 색 오렌지(입금확인요청과 구분), 버튼 '승인→신청 접수'.
- **신청 물리삭제** 버튼(상세 위험구역, 2단 confirm) = `deleteApplication`.
- **연수완료 일괄처리**: 연수관리 관리컬럼 '일괄완료' 버튼(항상 노출·종료회차만 활성) = `completeSessionApplications`(paid→completed). 신청관리 개별 완료 버튼 유지(노쇼 교정).

> 이하 원 설계 문서(맥락 참고용). 최종 동작은 위 '구현 결과' 기준.

---

## 0) 배경 — 왜 재편하나

현재 **요청관리(`/admin/requests`)** = 환불요청 + 수정요청 두 큐가 독립 메뉴로 묶임. 문제:
1. **수정요청**은 신청 1건의 속성 변경 → 신청관리에 속해야 함.
2. **환불**이 3조각으로 단절: ①환불요청(요청관리 `refund_requests.status`) ↔ ②금액확정(신청관리 '환불완료' → `applications.refunded_amount`) ↔ ③정산반영. **①을 completed로 바꿔도 ②③에 무영향**(actions.ts 확인). 실제 정산 반영액은 ②의 refunded_amount.
3. **수정요청이 자유텍스트 한 줄**(`content`)이라 어드민이 "무엇을 무엇으로" 파악·반영이 번거롭고, 요청↔반영이 4-hop 왕복.

snowpass(`_DEV/snowpass`, 같은 클라이언트 작년본)는 수정요청을 **정형화**(current/requested 대칭 + 완료 저장 시 원본 자동반영)해서 **클레임·고객응대가 원활**했다는 피드백 → 이 방식 채택.

---

## 1) IA 재편

- **요청관리 메뉴·라우트 삭제.** 사이드바 운영 그룹 6→5: 대시보드·신청관리·문의·증명서·정산 (`lib/adminNav.ts`).
- 환불요청 + 수정요청을 **신청관리(`/admin/applications`) 상단 세그먼트 워크리스트**로 흡수:
  `[신청 N] [수정요청 N] [환불요청 N]` (대기건 배지). 종목탭·상태필터·검색은 **'신청' 세그먼트 안에서만.**
- 정산관리(`/admin/settlements`)는 **손 안 댐** — 이미 refunded_amount만 읽음. `settlement-spec` 유지(읽기전용 대사).
- 세그먼트 = 공용 `components/admin/AdminTabs`(신청관리 세그먼트가 정본, [[admin-tabs-component]]).

---

## 2) 환불 통합

- 환불요청 처리 + 금액확정을 신청관리 한 자리로. **`confirmRefundFromRequest(reqId, appId, amount)`** 단일 서버액션:
  `refunded_amount` 설정 + 신청 status=refunded + 요청 status=completed 를 묶음 → 정산 자동 반영.
- 신청 상세의 기존 **'환불완료' 버튼 유지**(요청 없이 직접 환불하는 백업 경로). 결과는 같은 refunded_amount.
- 부분환불(수정 감액)도 이 큐로 자동 유입 → 4번 참조.

---

## 3) 수정요청 정형화 (자유텍스트 폐기)

### 3-1) 스키마 (seed 17)
`modification_requests`: `content`(자유텍스트) 제거 → **`changes` jsonb 배열**(변경 항목, 다중참가자 대응) + `user_note`(고객 특이사항) + `internal_note`(어드민 내부메모). status 3단(pending/completed/rejected). `admin_reply`(고객통지 답변) 유지.
`changes` 원소 구조 = seed 17 주석 참조. 요청 시점 `current` 스냅샷 + `requested`.

### 3-2) 필드셋 (확정)
참가자별: **성함·연락처·생년월일·성별 / 기초강습·용품세트·렌탈옵션(의류·보호대·고글·장갑)**. 전부 기존 `ParticipantEditModal`이 편집 가능([[companion-detail-post-signup-fill]]).
- **차수(회차) 변경 = 대상 아님 → 취소 후 재신청.** (이동 편집도구 안 만듦)
- PEA는 다중참가자 → snowpass flat 스키마 못 씀. **"어느 참가자" 지정 레이어** 필수(changes 원소의 participant_id).

### 3-3) 고객 폼 (재작성)
현재 = `app/my/page.tsx` ApplicationDetail의 textarea "기존 내용 → 변경할 내용"(단순) + `app/api/my/requests/route.ts` modification 분기(content insert).
→ **정형 폼으로 재작성**: 참가자 선택 → 현재값 자동표시 → 항목별 "유지" 토글 해제 시 변경값 입력(input/select). 보조 특이사항 자유텍스트. API 스키마도 content→changes[] 로 교체(zod).

### 3-4) 어드민 처리 (컴팩트가 핵심)
수정요청 세그먼트 리스트 = 변경항목 **칩 요약** + 대기 배지. 처리 모달 한 곳에서:
1. current→requested **diff 뷰**(변경 항목만 하이라이트).
2. **[자동 반영]** → 기존 `ParticipantEditModal`(또는 그 반영 액션 `participantDetail`)에 requested 프리필 → 어드민 조정 가능.
3. 상태 select(대기/완료/반려) + **답변 문구 자동생성**(diff 기반, 수정 가능) → 고객 통지.
4. **완료 저장 시에만** 원본 `participants` UPDATE(수동 승인형). 반려/대기는 원본 미변경.

---

## 4) 요금 엣지케이스 — 반영이 요금에 닿을 때

필드셋 중 **요금 연결 = 렌탈 유료옵션(의류·보호대·고글·장갑) 뿐.**
(보험 무료·용품세트 무료·기초강습·인적정보 = 무영향. 오너 확정.)

반영 확정 시 `applyOverrides`/price_breakdown **재계산** → 기존 total과 **차액**으로 분기:

| 델타 | 처리 |
|---|---|
| **0 (정보성)** | 그냥 반영, 완료. |
| **− (부분환불)** | **환불요청 자동 생성·연동**(`origin='modification'`, `amount`=차액, `modification_request_id` 링크) → 환불 워크리스트 유입 → 어드민 처리 시 refunded_amount → 정산 자동. **status paid 유지**(전액취소 아님; settlement-spec상 refunded_amount는 status와 무관 차감). |
| **+ (추가결제)** | 고객 **알람 + 마이페이지 신청현황 '입금대기(추가)' 전환** + `applications.due_amount`=부족분. ⚠**내부 base status=paid 유지**(full pending 되돌리면 매출 이탈→정산 깨짐). 표시만 입금대기. 기존 payment-claim/입금확인 UI 재활용, 부족분 입금확인 시 total_amount 갱신 + due_amount=0. |
| **미입금(pending) 건** | 델타 무의미 → total_amount만 갱신(새 금액으로 입금). 부분환불/추가결제는 **입금확정(paid/completed) 건에만**. |

**컴팩트 UX**: 반영 확정 순간 모달에 **금액변동 배너**(예 `248,000 → 268,000  +20,000 · 의류 추가`) + 자동 라우팅(감액→환불요청 자동생성 / 증액→추가입금 안내발송·상태전환). 어드민은 확인만.

---

## 5) seed 17 (`_DEV/seeds/17_requests_restructure.sql`, 초안)
- modification_requests: +changes(jsonb) +user_note +internal_note, content 제거(→user_note 이관), status CHECK→(pending/completed/rejected)
- refund_requests: +amount +origin('user'/'modification') +modification_request_id
- applications: +due_amount(int default 0)
- 멱등. 배포 전 필수(신규 컬럼 select).

---

## 6) 파일 인벤토리 (예상)
**스키마**: `_DEV/seeds/17_requests_restructure.sql`
**타입/디스플레이**: `lib/types.ts`(ModificationRequest·RefundRequest·Application 확장), `lib/display.ts`(status 라벨 3단), `lib/applicationTypes.ts`
**어드민 네비/조회**: `lib/adminNav.ts`(requests 제거), `lib/adminQueries.ts`(mod/refund 쿼리 이동·정형화, changes select)
**어드민 UI**: `app/admin/(panel)/requests/*` **삭제**, `app/admin/(panel)/applications/*`(세그먼트+수정요청/환불요청 처리 모달·자동반영·금액변동 배너·confirmRefundFromRequest·applyModification 액션)
**고객측**: `app/my/page.tsx`(정형 수정요청 폼), `app/api/my/requests/route.ts`(zod content→changes)
**요금 재계산**: `lib/applyClient.ts`(공용 price 계산 서버 재사용 지점 확인 필요)
**정산**: 변경 없음(반영만).

---

## 7) 구현 순서 (권장 단계)
1. seed 17 실행 + `lib/types.ts`/`display.ts` 타입 정비(빌드 그린 기준선).
2. IA 재편: 요청관리→신청관리 세그먼트 이동(기능 동일, 껍데기 먼저). 사이드바 5개.
3. 환불 통합: `confirmRefundFromRequest` + 신청관리 내 환불요청 처리.
4. 수정요청 정형화 — 고객 폼(정형) + API(changes) + 어드민 처리 모달([자동반영]·완료 시 원본 UPDATE).
5. 요금 엣지: 재계산 + 3분기(부분환불 자동 환불요청 / 추가결제 due_amount·상태전환·알람) + 금액변동 배너.
6. 검증: tsc·eslint, dev에서 각 분기(정보성/감액/증액/미입금) 시나리오.

---

## 8) 오픈 디테일 / 미결
- **부분환불 환불계좌**: 수정폼은 계좌를 안 받음 → 자동생성된 refund_request는 계좌 null. (a) 감액 감지 시 수정폼에서 조건부로 계좌 입력받기 vs (b) 어드민이 처리 중 수집. 기본 (b), 여유되면 (a).
- **알람 채널**: '추가입금 알람'의 실제 수단(문자/알림톡 연동 여부) 미정 — 우선 마이페이지 상태전환 + 답변 통지로, 외부발송은 후속.
- **payment-claim 재활용 범위**: 추가결제 입금확인을 기존 입금확인요청 UI로 그대로 쓸지, 별도 '추가입금 확인' 액션 둘지 구현 시 판단.
- **is_secret**: 마이페이지 OTP 인증 경유라 사실상 무의미 — 유지하되 미사용 가능.

## 9) 검증
dev=live Supabase. `verify-with-tsc-when-dev-running`(dev 중 next build 금지). 커밋은 dev 확인 후 승인받아 push([[commit-push-together]]).
