# handoff — 어드민 신청연동(완료) + 발번개편 + 동반인 후속입력(진행중, 3~5단계 남음)

작성 2026-07-06. 브랜치 main. **이번 세션 커밋 안 함(전부 워킹트리)** — 오너가 라이브 확인 + 디테일 수정을 다음 세션에 하기로. 모든 변경 `npx tsc --noEmit` 클린.

> **다음 세션 시작**: 이 핸드오프 + 메모리 `[[companion-detail-post-signup-fill]]`·`[[jayul-apply-form-spec]]`·`[[design-taste-crisp-minimal]]`·`[[submit-pipeline-ops]]`·`[[payment-claim-policy]]` 먼저 읽기.

---

## 0. ⚠ Supabase 실행 상태 (다음 세션 확인 필수)
- `11_application_no_v2.sql` — **오너 실행 완료**(발번 개편). 
- `09_certificate_participant.sql` — 실행 여부 미확인. 증명서 발급현황 동작 전제.
- `10_dummy_applications.sql` — 더미 10건(직무5+자율5). 실행 여부 미확인. 실행 시 기존 PEA 테스트건 삭제됨.
- 새 seed 추가 시 Supabase 실행 + `NOTIFY pgrst`. [[submit-pipeline-ops]]

## 1. 이번 세션 완료 (전부 tsc 클린)

### A. 어드민 신청 연동 (핸드오프 요구 1~5 전부)
- **신청 관리** `/admin/applications` — 목록(순번·프로그램탭·유형/상태 셀렉트·이름·연락처 실시간검색·페이지네이션20/우상단) + 상세(상태변경 **2층위**[정상 스테퍼/예외 danger]·입금확인요청 대조·신고해제·참가자표·보험뒷자리 온디맨드 복호·관리자메모·**참가자 상세 수기입력 모달**).
- **요청 관리** `/admin/requests` — 환불(신청대기→신청확인→환불완료)·수정(대기→수정확인→수정완료+수정반려 예외+답글) 게시판형.
- **증명서 발급** `/admin/certificates` — 연수완료 참가자 수료증 발급현황(차수필터·발급/취소). 사이드바 운영그룹에 추가.

### B. 발번 체계 개편 → `{종목}{유형}-YY-00001`
- 종목 S(스키·스노보드)/T(테니스)/W(윈드서핑)/E(운동처방), 유형 **CT(직무=Credit Training)/FP(자율=Free Package)**. 예 `SFP-27-00001`.
- `seed 11`(카운터 `(prefix,year)` 복합키 + `next_application_no(p_prefix,p_year)`), `lib/programs.ts applicationPrefix()`, 제출 route가 course.sport로 접두어 산출. PEA 접두어 폐기.

### C. 공용 컴포넌트·규칙
- `components/admin/AdminList.tsx` — 제네릭 리스트(순번 01·필터박스 toolbar·우상단 페이지네이션·전체/검색결과 라벨분기). `AdminFilterPills` export.
- `lib/programs.ts`(PROGRAMS 종목 공용·신청페이지와 통합), `lib/lessonOptions.ts`(직무 반 + **자율 기초강습 JAYUL_LESSONS** + **EQUIPMENT_TYPES** + lessonLevelLabel/equipmentLabel).
- **[[design-taste-crisp-minimal]] 규칙 메모리화**: 선택·포커스·필터 = 배경 틴트만, 테두리·ring 금지(surface 보더만 예외). 반복 지적받아 박음.
- "신고"→"확인요청" 라벨 통일, 날짜 슬래시, 강습 표기 신청폼과 통합.

### D. 동반인 후속입력 — 원칙 + 1·2단계 ([[companion-detail-post-signup-fill]])
**원칙(오너):** 신청 단계 단순 유지(비대표 정보 신청폼에 안 넣음). 동반인 상세는 신청 후 셀프필 링크(대표가 복사→단톡 공유, **시스템 발송 없음=비용0**) 또는 어드민 수기로 입력 → 모두 어드민 반영.
- **1단계 완료** — 자율 대표폼에 **기초강습(스키기초/보드기초/프리라이딩)·대여장비(스키/보드 세트)** 추가. 대표 참가자 레코드에 저장(lesson_level·rentals.equipment).
- **2단계 완료** — 자율폼 **동반인 명단 섹션 제거**(대표+인원수+옵션만). 제출 시 대표 + **빈 슬롯(N-1)** 생성("동반 2"…). payload/타입/zod에서 companions 제거.
- **공용 갱신 로직** `lib/participantDetail.ts updateParticipantDetail()` — 생년월일·성별·뒷자리(AES암호화). 어드민 수기 모달(신청상세 참가자표 "입력/수정")이 이미 이걸 호출. 셀프필도 재사용 예정.

---

## 2. 남은 단계 (다음 세션, 순서대로)

### 3단계 — participantDetail 확장 + 어드민 수기 모달 확장
동반인 placeholder 슬롯을 **완전히** 채우려면 현재 모달(생년월일·성별·뒷자리)만으론 부족. 추가 필드:
- `lib/participantDetail.ts`에 **name·phone·lessonClass(기초강습)·equipment·apparelSize** 추가.
  - ⚠ **rentals jsonb는 merge**(equipment/apparel_size를 기존 rentals에 병합, insurance_wanted 등 덮어쓰지 말 것). 현재 로직은 rentals 안 건드림 → 확장 시 기존 값 fetch 후 merge 또는 jsonb `||`.
  - lessonClass → `lesson_level`. name/phone → 컬럼. 
- 어드민 `ParticipantEditModal`(app/admin/(panel)/applications/ApplicationsClient.tsx)에 성함·연락처·기초강습(select JAYUL_LESSONS)·대여장비(select EQUIPMENT_TYPES)·의류사이즈 필드 추가. 액션 `updateParticipantDetail` 시그니처 확장.
- 어드민 상세 참가자표에 **장비(rentals.equipment) 표기**(equipmentLabel) 추가 검토.

### 4단계 — 마이페이지 동반인 입력 영역 + 셀프필 링크 복사
- `app/my/page.tsx` 신청 상세에 **"동반인 정보 입력"** 영역: 슬롯별 입력(대표가 대신) — `/api/my/*` 엔드포인트로 토큰(verifyMyToken) 소유권 검증 후 participantDetail 호출.
- **"링크 복사" 버튼** — 셀프필 URL 생성·클립보드 복사(대표가 단톡 공유). 자동 발송 아님.

### 5단계 — 셀프필 공개 페이지 + 토큰
- `lib/serverCrypto.ts`에 `issueFillToken(applicationId)`/`verifyFillToken` (HMAC opaque, MY_SESSION_SECRET 재사용 가능).
- 공개 페이지 `/fill/[token]`(또는 `?t=`) — GET 로스터(이름·입력완료 여부, **뒷자리 절대 노출 안 함**) → 각자 성함·성별·연락처·생년월일·뒷자리·기초강습·장비·사이즈 입력 → `/api/fill` POST(토큰→applicationId 검증, participant가 그 신청 소속인지 확인) → participantDetail.
- 링크 노출: 마이페이지(4단계) + 어드민 상세(관리자 복사용).

**수집 필드셋(참고이미지 6~14):** 성함·성별·연락처·생년월일(+뒷자리 보험시)·기초강습·대여장비·의류사이즈. 보호대/고글/장갑=금액영향→대표가 신청 시 수량 확정(개인 배정은 optional 후속).

## 3. 다음 세션 = 라이브 확인 + 디테일 수정 (오너 예정)
- 자율폼(대표만 남은 참가자 섹션·기초강습·장비 신설) 라이브 확인 → 톤/문구/레이아웃 디테일 수정.
- 어드민 신청관리 필터·정렬·검색·상세·수기입력 확인(더미 10건).
- 증명서/요청관리 확인(seed 09/10 실행 후).

## 4. 불변 제약
표시텍스트=Text variant / 버튼=BTN / 입력 16px / 날짜=슬래시 / **선택·필터·포커스=틴트, 테두리금지([[design-taste-crisp-minimal]])** / 셸 3패턴 / `MasterDetail.tsx` 수정금지 / 검증=`npx tsc --noEmit`(next build 금지) / UI변경=로컬확인→승인후 push / 뒷자리 평문저장 금지 / 볼륨 밖 접근금지.

## 5. 핵심 파일 (이번 세션)
- 어드민: `app/admin/(panel)/{applications,requests,certificates}/*` · `components/admin/AdminList.tsx` · `lib/adminQueries.ts`
- 발번: `_DEV/seeds/11_application_no_v2.sql` · `lib/programs.ts` · `app/api/applications/route.ts`
- 동반인/폼: `components/features/JayulApplyForm.tsx` · `lib/applicationTypes.ts` · `lib/participantDetail.ts` · `lib/lessonOptions.ts`
- seed: `09_certificate_participant`·`10_dummy_applications`·`11_application_no_v2`
- 더미 뒷자리 암호문 = 로컬 APP_ENC_KEY 로 실제 암호화(로컬 복호 테스트용, 프로덕션 키 다름).
