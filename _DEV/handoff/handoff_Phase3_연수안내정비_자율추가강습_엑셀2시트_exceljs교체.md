# 핸드오프 — 연수안내 정비 + 자율 추가강습 + 수정요청 보강 + 엑셀 2시트 개편 (2026-08-05)

## 요약
오전: 신청폼 **소속·지역 제거**(수집→저장→조회→엑셀 전 경로) + 직무 강습수준·개별객실 안내 보강 → 커밋 `4ea9917`.
오후: 연수안내 정비, 자율 **추가(개별) 강습** 신규, 렌탈 **1박/2박 요금 분기**, 마이 **수정요청 보험·사이즈** 보강,
어드민 엑셀 **2시트 + exceljs 교체** → 커밋 `7e77b5b`.

두 커밋 모두 **푸시 완료**.

### git 인증 — 외장 드라이브 SSH 키로 전환 (2026-08-05)
증상: 프로젝트를 외장(`/Volumes/BridgeNine`)에 두고 머신을 옮겨가며 작업하는데, 자격증명은 **머신 키체인**에 저장돼
새 머신마다 푸시가 막혔음(`could not read Username for 'https://github.com'`).

해결: **키를 프로젝트와 함께 외장에 두고** 저장소가 그 키만 쓰도록 고정.
- 키: `/Volumes/BridgeNine/.ssh/pea_ed25519` (암호 없음, `chmod 600`)
- GitHub **Deploy key**(저장소 전용, write 허용)로 등록 — 계정 전체 키가 아니라 드라이브 분실 시 이 키만 지우면 차단됨
- `git config core.sshCommand "ssh -i /Volumes/BridgeNine/.ssh/pea_ed25519 -o IdentitiesOnly=yes"`
- remote = `git@github.com:reverve9/pea.git`

`.git/config`도 외장에 있으므로 **다른 머신에서 추가 설정 불필요**. 드라이브가 마운트돼 있으면 그대로 동작.

⚠ **Claude 세션 주의**: SSH 푸시는 샌드박스에서 조용히 실패한다(`git fetch`가 빈 출력으로 끝남).
푸시·페치는 샌드박스 해제(`dangerouslyDisableSandbox`)로 실행할 것.

---

## 1. 신청폼 소속·지역 제거 (커밋 `4ea9917`)
공통 `ApplicantFields`(`components/features/apply/shared.tsx`)에서 소속 Field 삭제 → 직무·자율 동시 반영.
`ApplicantCore`/`ApplicantInput`, zod applicant 스키마, applications insert, 어드민 상세 줄·엑셀 컬럼, `adminQueries` select·타입까지 제거.
**DB 컬럼 `school_name`/`region`은 유지** — 기존 데이터 보존용(신규 신청은 null). drop 원하면 별도 마이그레이션 필요.

## 2. 연수안내(/courses) — `components/features/CourseTypes.tsx`
- **자율 옵션 순서 = 주말2박 → 주중2박 → 주말1박** 으로 통일. 서로 달랐던 **8곳 일괄 정렬**:
  `CourseTypes.JAYUL_VARIANTS` · `PriceTable.pkgBuckets` · `ScheduleCalendar.SCHEDULE_HEX`(키 순서 = 범례 순서) ·
  `JayulApplyForm.VARIANTS` · 어드민 `SessionsClient.TYPE_ORDER`·`JAYUL_VARIANTS` · `BaseGrid.PKG_VARIANTS` ·
  `ApplicationsClient.SCHEDULE_ORDER`.
  **제외(순서 무관)**: `sessions/actions.ts TYPES`(검증 화이트리스트), zod enum, 타입 유니온, 조회용 Record 맵.
- 옵션별 안내에 **숙박** 행 추가(2박 1실 / 2박 1실 / 1박 1실). `JayulVariant.stay`.
- 직무 단체식·수준별 강습 하위줄 **괄호만 제거**(설명 유지). 리프트권은 원래 `note` 로직이 괄호를 벗겨 표시 중이라 무변경.
- 자율 강습 재구성: `기초 단체 강습 1회` + `그룹 체험 강습 1회`(서브: 입문자 기준 강습 운영) **2항목**,
  `개별 강습이 필요할 경우 추가 옵션을 선택하실 수 있습니다.` 는 `CourseType.notice` 로 **추가렌탈 위 전체폭 박스**(체크리스트와 분리).
- 추가렌탈 `grid` → `gridRows`(2박/1박 2행). 데스크탑 = 박수 라벨 + 4항목 한 줄 / 모바일 = 라벨 아래 2열 2행.
- `IncludeDetail.sub` 타입이 `React.ReactNode` 로 확장됨(모바일 줄바꿈용 br 등).

## 3. 자율 신청폼 — `components/features/JayulApplyForm.tsx`
- 섹션명 `기초강습 · 대여 장비` → **`강습 · 대여장비`**.
- **그룹 체험 강습** 을 기초 단체 강습과 같은 층위 Field 로 노출 — OptionRow 와 동일한 라디오 표식 + `기본 포함` 배지, 조작 불가(div).
- **추가 강습 (선택)** 신규:
  - 시간대별 횟수 카운터(`QtyRow` 재사용, `unitLabel="회당"`). **합계가 곧 수량** → 별도 수량 입력 없음.
    (초안은 수량 카운터 + 수량만큼 드롭다운이었으나 오너 지시로 변경. 수량≠슬롯수 오류 상태가 구조적으로 사라짐.)
  - 시간대는 박수 종속 — 1박 `1일차 야간/2일차 오전`(2), 2박 `+2일차 오후/2일차 야간/3일차 오전`(5). `lib/lessonOptions.lessonSlotsFor`.
  - **같은 시간대 중복 선택 가능**(숫자로 표현). 합계 상한 `PRIVATE_LESSON_MAX = 5`(인원수와 무관 — 오너 지시).
  - 유형 변경 시 슬롯 초기화(1박↔2박은 선택지가 다름).
  - 서버 재검증: 슬롯 개수 = qty, 슬롯이 해당 박수에 존재하는지. `meta.private_lesson`(qty·slots)에 보존.
  - 단가 **180,000원** = `price_items('rental','lesson_private')`. **이 행이 없으면 필드 자체가 렌더되지 않음**(가격 없는 옵션 노출 방지).
- **렌탈 요금 1박/2박 분기** — `lib/pricing.rentalPriceItem(by, key, oneNight)`.
  1박은 `{키}_1n`, 없으면 기본(2박)가로 **폴백**. 장갑은 구매라 박수 무관 → `glove_1n` 없음(폴백으로 15,000원).
  나중에 `glove_1n` 행만 추가하면 코드 수정 없이 적용됨. 서버 재계산과 폼 실시간 합계가 같은 함수 공유. 직무는 항상 2박이라 무관.

## 4. 마이페이지 수정요청 — `app/my/page.tsx`, `app/api/my/requests/route.ts`
- **여행자 보험** 항목 추가(`ModificationField.insurance`). `가입 희망` 전환 시 주민번호 뒷자리 입력칸 노출,
  이미 등록된 참가자는 재입력 불필요 안내.
- **뒷자리는 `changes`(jsonb)에 절대 넣지 않는다** — 어드민 화면에 그대로 노출되고 평문으로 남는 자리.
  `birthBack`/`birthBackParticipantId` 별도 파라미터 → 신청폼과 동일하게 `updateParticipantDetail` 로 AES-256-GCM 암호문만 저장.
  **마이그레이션 없음**(기존 암호화 경로 재사용 — 초안의 `modification_requests.birth_back_enc` 컬럼 추가안은 폐기).
  ⚠ 승인 전 선반영이지만 대상은 복호 불가 암호문 1개뿐. 요금·명부 필드는 어드민 반영 시에만 변경.
- **서버 검증 추가** — 보험 희망 전환인데 뒷자리 미동봉이고 기존 등록도 없으면 **400 차단**.
  (클라이언트 검증만 있던 상태를 발견해 보강. 검증: 미입력 400 / 동봉 200 / 기등록 재요청 200.)
- **렌탈 사이즈** — `rental_*_size` 3종 추가. `신청` 전환 시 최초 접수와 동일 옵션(의류 S~2XL, 보호대·장갑 S/M/L, 고글 없음),
  미선택 시 접수 차단. `미신청` 으로 되돌리면 사이즈 요청 자동 제거.
- **표시값 한글화** — `lib/display.modificationValueLabel()` 공용화.
  마이 수정요청 폼 · 마이 처리이력 요약 · 어드민 요청카드 · 고객 자동답변 **4곳이 같은 문구** 사용.
  저장값은 기계값 유지(어드민 반영 로직이 파싱). `MODIFICATION_FIELD_LABEL`(그동안 미사용 상수)을 라벨 단일 진실원천으로 복권 —
  접수 시점 스냅샷 label 이 원시 필드명이어도 화면엔 한글이 나감.
- 어드민 `applyModification`/`revertModification` switch 에 신규 필드 케이스 추가.
  요금 델타는 `RENTAL_FIELD_KEY` **정확일치** 조회라 사이즈 필드가 금액에 영향 없음.

## 5. 어드민 엑셀 내보내기 — `lib/excel.ts`, `ApplicationsClient.tsx`
### exceljs 교체 (xlsx 제거)
`xlsx` 0.18.5(SheetJS 커뮤니티)는 **셀 서식 쓰기가 Pro 유료 전용** — 헤더 색·테두리 불가, 틀고정은 코드 자체가 없음.
→ **exceljs 4.4.0(MIT, 무료)** 로 교체. 시그니처(`exportToExcel`/`exportToExcelMultiSheet`) 유지 → **정산관리도 코드 수정 없이 동일 서식**.
- 서식 정본: 헤더 네이비(#1e3a5f)+흰 굵은글씨+가운데정렬+높이24, 본문 테두리(#e5eaef)+높이19,
  숫자 천단위+우측정렬, 컬럼 너비 내용 기반(한글 1.6배 환산, 8~40), **틀고정(헤더)**, 자동필터.
- `ExcelSheet.groupBy` 추가 — 같은 그룹끼리 교차 배경(#f3f6f9).
- `xlsx` 제거로 **패치 불가였던 high 2건**(Prototype Pollution, ReDoS) 해소. `fix available: false` 상태였음(SheetJS npm 배포 중단).
- 남은 `exceljs` moderate 1건 = 전이 `uuid@8.3.2` 버퍼 경계(v3/v5/v6에 buf 직접 전달 시). npm 제안 수정은 exceljs 3.x 다운그레이드라 **미적용**.

### 2시트 구조 (클라이언트 요구 반영)
- **`신청현황`** = 1행 1신청(31컬럼). 금액·정산·연락용.
- **`참가자 정보`** = 1행 1명, 대표 포함 전원(21컬럼). 명부·조편성·렌탈용. 자율 빈 슬롯도 `정보입력=미입력` 로 포함.
- 한 시트에 참가자를 반복하면 **금액이 인원수만큼 중복 합산돼 정산이 틀어짐** → 단위 분리가 이 구조의 이유.
- 클라이언트 요청 11항목 반영: 렌탈 항목별 수량·사이즈, 참가자 생년월일·성별·희망 강습 수준,
  동반인 유무/성함/연락처(`companion_memo` 파싱), 객실 구분·상세, 알게된 경로, 수집 동의, 추가강습 횟수·시간대.
- 시트 연결 3종: 참가자 시트 **신청자(대표) 컬럼**, **신청별 교차 배경**, 신청현황 **참가자 명단 요약**.
  **하이퍼링크는 채택하지 않음** — 고정 행번호를 가리켜 정렬·필터(자동필터 켜둠) 시 엉뚱한 행으로 점프.
  필요해지면 `HYPERLINK`+`MATCH` 수식으로 넣을 것(클릭 시점 재탐색이라 정렬에 안 깨짐).
- `adminQueries` 보강: `privacy_agreed`·`price_breakdown` select 추가, `rental_qty`·`private_lesson` 파생(`lib/pricing.extract*`).
- 렌탈 수량: 자율=신청 단위 구매수량, 직무=대표 참가자 on/off를 1/0 환산(`rentalQtyFromFlags`).

---

## DB 작업 (전부 반영 완료 — 별도 실행 불필요)
로컬 dev와 프로덕션이 **동일 Supabase**(`xxypzbvwvxpkxlcdvcrr`)라 REST(service_role)로 직접 반영함. **DDL 없음.**
- **신청 데이터 전량 삭제** — applications 34건 + participants 62 + cash_receipts 9 + refund/modification/certificate_requests 27 + inquiries 3.
  삭제 전 8개 테이블 JSON 백업(세션 scratchpad, 휘발성 — 필요하면 다시 뽑아야 함).
- **`application_counters` 초기화** — 런칭 후 첫 신청이 `SCT-27-00001`/`SFP-27-00001` 부터 시작.
- `price_items` 추가: seed 25(개별객실 `room_22_4_rep`·`room_33_5_rep` 0원), seed 26(`apparel_1n` 20,000·`goggle_1n` 10,000·`protector_1n` 10,000),
  seed 27(`lesson_private` 180,000).
- 시드 파일은 **기록·재현용**(UPSERT라 재실행 무해). 오너가 SQL 에디터에서 돌릴 필요 없음.

## 현재 더미 데이터 (UI 작업용)
마이페이지 로그인 = **`테스트` / `01012341234` / `900101`** (4건 모두 같은 값 → 1회 본인확인으로 전부 조회)

| 신청번호 | 유형 | 인원 | 금액 | 구성 |
|---|---|---|---|---|
| `SCT-27-00001` | 직무연수 | 1 | 458,000 | 개별객실 22평4인실 2인 · 의류(L) · 고글 |
| `SFP-27-00001` | 자율 주말2박 | 3 | 1,008,000 | 스키 · 의류×2 · 고글×1 |
| `SFP-27-00002` | 자율 주중2박 | 2 | 715,000 | 보드 · 의류×1 · 보호대×1 |
| `SFP-27-00003` | 자율 주말1박 | 4 | 836,000 | 프리라이딩 · 렌탈 없음 |

⚠ `SCT-27-00001` 에 **수정요청 1건(pending)** 이 걸려 있음 — 보호대 신청+사이즈S, 보험 희망(뒷자리 등록됨).
어드민에서 `반영 · 처리완료` 누르면 총액 478,000원. 오픈 전 더미 전체 삭제 + 카운터 재초기화 필요.

## 검증 상태
- 타입체크·eslint·`next build` 전부 통과.
- 실제 신청 API 로 검증한 것: 소속·지역 없는 제출(직무/자율), 렌탈 1박/2박 가격 분기,
  추가강습 슬롯 유효성·개수 일치·상한·중복 슬롯, 수정요청 보험 서버 검증 3케이스.
- 엑셀은 파일을 생성해 되읽어 **헤더 배경·폰트·테두리·행높이·틀고정·자동필터·숫자서식·그룹 교차배경**이 기록되는 것 확인.
  **실제 다운로드 UI 동작은 미검증**(어드민 로그인 필요) — 신청관리에서 한 번 눌러볼 것.
- 어드민 `반영 · 처리완료` 는 오너가 실제로 눌러 검증 완료(총액·사이즈·보험·뒷자리 반영 확인).

## 남은 것 / 다음
1. **`git push origin main`** (커밋 2건 대기).
2. 엑셀 내보내기 실제 다운로드 확인(서식·2시트).
3. 오픈 전 더미 4건 + 수정요청 삭제 → `application_counters` 재초기화.
4. 미결 판단 대기:
   - 추가강습 상한 5회를 인원수(최대 6) 기준으로 바꿀지.
   - 자율 `glove_1n`(1박 장갑가) 별도 책정 여부.
   - `applications.school_name`/`region` 컬럼 drop 여부.
5. 어드민은 **새 요청이 들어와도 새로고침 전엔 안 보임** — `dynamic='force-dynamic'` 이라 데이터 정합성 문제는 없음(설계 선택).
   신경 쓰이면 폴링/배너 추가 가능.
