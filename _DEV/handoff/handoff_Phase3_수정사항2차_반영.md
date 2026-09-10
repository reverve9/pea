# 핸드오프 — 홈페이지 수정사항 2차 반영 (2026-09-10)

## 요약
클라이언트 2차 수정요청(`_DEV/홈페이지수정사항_2차.pdf`, 12p) **구현 항목 전부 반영**.
남은 것은 재단이 자료/결정을 줘야 하는 항목뿐 — `_DEV/재단_확인사항.md` 로 분리.

커밋(전부 푸시 완료):
| 커밋 | 내용 |
|---|---|
| `b167158` | 현금영수증 수기 발급처리(승인번호 확정·실패처리) |
| `9318a4e` | 2차 반영 1차분(p1~p6·p9·p10) |
| `4ae6cd6` | 2차 반영 잔여분(p7·p8·p11) + 보험명단 시트 + 개인정보처리방침 등록 |
| `f1a1c5c` | **use-server 상수 export 버그(전체 500) 수정** + 일정표 표 형태 재작업 |

> PDF 텍스트 레이어가 폰트 인코딩 때문에 깨져 있음. 읽으려면 PyMuPDF로 페이지를 이미지로 렌더해서 볼 것
> (`p.get_pixmap(dpi=130)`). p8 두 번째 표는 슬라이드 밖으로 잘려 있어 별도 캡처로 대조함.

---

## PDF 페이지별 반영 내역

### p1 — 자율 추가강습 회당 1회
- `lib/lessonOptions.ts` `PRIVATE_LESSON_SLOT_MAX = 1` 신설(합계 상한 `PRIVATE_LESSON_MAX = 5`는 유지)
- `JayulApplyForm` 카운터 `max=1` + 세터 이중 클램프(슬롯 상한 · 합계 여유)
- `app/api/applications/route.ts` — `slots` 중복 거부 refine(폼만 막으면 우회 가능)
- 안내문구: "추가 강습을 희망하실 경우 시간대별 횟수를 선택하세요 / * 시간대마다 1회만 가능합니다"

### p2 — 엑셀 보험 명단
- `revealInsuranceBackDigits(applicationIds)` 서버액션(`applications/actions.ts`) — `requireAdmin` + service_role, 200건 청크 복호
- 엑셀 **3시트** 구조로: `신청현황` / `참가자 정보` / **`보험명단`**(신규)
- `보험명단` = 보험사 제출용 최소 4열 **연번 · 성명 · 주민등록번호 · 보험기간(연수기간)**
  - 주민등록번호 = `birth_front` + `-` + 복호한 뒷자리 → 하이픈 덕에 엑셀이 문자열로 잡아 앞자리 0 보존
  - 정렬 = 회차 → 신청번호(보험기간 단위로 끊어 넘기기 쉽게), 회차 경계는 교차 배경
  - **참가자 시트에서는 주민번호 제거** — 가입 여부(`보험` 컬럼)만. 원문은 이 시트에만

### p3 — 마이페이지 진입
- 마이 칩을 **데스크탑도 헤더 우측으로 이관**(`PWAHeader`), 모바일과 동일 위치·형태
- 상단 네비(`PWATopNav`)는 콘텐츠 4개 균등(`grid-cols-4`) — 마이는 주 메뉴 층위가 아님
- **원형 칩 유지 + 라벨은 칩 아래(MY)**. 아이콘+텍스트 가로 필(pill)로 만들었다가 "원형이 무너진다"고 반려됨 → [[mobile-nav-standalone-toggle]] 메모리에 기록
- 아이콘은 `UserRound` 유지(오너 판단)

### p4 — 환불 규정
- `app/my/page.tsx` 캡션 → "기준일은 연수 시작일이며, 환불 요청은 환불 신청 메뉴에서 접수해 주세요."
- 본문은 DB — `_DEV/seeds/28_refund_policy_copy.sql` **실행 완료**(라이브 조회로 확인)
- FAQ 2번(환불)은 이미 신규 문구로 등록돼 있었음 — 수정 불필요

### p5 — 연수안내 개요
- 문의 = `홈페이지 내 1:1 문의 · 02-7728-7947` + 서브라인 `연결 가능 시간 : 평일 10:00~17:00`, **이메일 삭제**
- 알펜시아 주소가 텍스트로만 찍혀 클릭이 안 됐음 → 실제 `<a target="_blank">` + `https://`, 외부링크 아이콘

### p6 — 유형 분리 (B안)
- `CourseTypeAccordion`(2행 아코디언) → **`CourseTypePanel`**: 선택 유형 하나만 항상 펼침
- `components/features/TypeSwitchBanner.tsx` **신규 공용** — 신청 페이지 안에 있던 `SelectedTypeBanner`를 추출해 신청/연수안내가 공유(`action` prop = '신청하기' / '보기')
- **개요는 공통 유지**, 일정 캘린더는 유형별 필터(아래 참조) — A안(전 페이지 유형 종속)이 아니라 B안

### p7·p8 — 일차 일정표
`components/features/CourseSchedulePlan.tsx` 신규, `TypeDetail` 맨 아래(데스크탑 패널·모바일 모달 공용).
직무 = 단일 표 / 자율 = 탭 2개(2박 3일 · 1박 2일).
1박 2일 표는 PDF에서 잘려 있었고(2일차 첫 행까지만) 재단 캡처로 대조 확인 완료.

⚠️ **여기서 세 번 반려됐다. 최종 형태를 유지할 것:**
1. 처음에 "우리 스타일 = 격자 버리기"로 읽고 2열 리스트로 만들었다 → **틀렸다.**
   오너 의도는 "**표는 표로 만들되 스타일만 우리 것**"이었다.
2. 표로 바꿨으나 박스 없이 맨몸으로 뒀다 → "표라는 걸 확실히 보여줘야 할 거 아냐".
   **개요·캘린더와 같은 박스 어법**(라운드 박스 + 틴트 헤더행)으로 감싸야 한다.
3. 열 폭·정렬이 들쭉날쭉했다 → "정렬이라는 개념을 몰라?"

최종 구조:
- 4열 `일차 · 시간 · 내용 · 비고`, `table-fixed`로 열 고정, **일차는 `rowSpan` 세로 병합**(원본과 동일)
- 컨테이너 = `rounded-[10px] border-[#e5eaef]` 박스, `thead` = `bg-[#eef2f6]` 틴트, 행 하이라인
- 일차가 바뀌는 행만 경계선을 진하게 → 격자 없이 일차 묶음이 보인다
- **시간 표기는 `-` 로 통일**(`~` 금지). 렌더는 **하이픈 축 3열 그리드**(시작 우측 · 하이픈 · 종료 좌측)
  → `- 12:30` / `12:30 - 13:00` / `21:30 -` 의 숫자 자리가 행마다 정확히 맞는다. 가운데 정렬로 두면 어긋난다
- **여러 줄 항목은 `title`/`note` 를 `string[]` 으로** 저장(`toLines()`). 원본에서 줄이 나뉜 항목
  (`폐강식 / * 개별 실습 / * 개별 장비반납` 등)을 한 문자열로 합치면 셀 폭에 따라 엉뚱한 데서 끊긴다.
  보조로 `break-keep`(어절 단위 줄바꿈)
- 반응형: 데스크탑 `일차 54 / 시간 136`, 모바일 `42 / 104` — 고정폭이 좁은 화면에서 내용 열을 짓누른다
  (수정 전 모바일 내용 118px → 162px). 비고 열은 모바일에서 접어 내용 아래 서브라인으로

### p9 — 캘린더
- **하단 범례 폐지**, 바 안에 차수명(`session.label`) 표기. 바 6→16px, 레인 11→19px
- 좁으면 말줄임 + `title` 툴팁. 주 경계를 넘는 차수는 조각마다 이름 반복
- ⚠️ 주말1박 앰버(`#d18a3c`) 위 흰 글씨 대비가 약함 — 목업과 동일해 일단 유지, 흐리면 앰버만 한 톤 darken(좌 마스터 칩 색도 같이 따라감)

### p10 — 생년월일
- `apply/shared.tsx` `hint="YYMMDD 6자리"` 삭제(placeholder와 중복). 공용이라 직무·자율 동시 적용

### p11 — 커뮤니티
- 좌 페인 **공지 리스트·페이지네이션 제거**(우 페인에 같은 목록이 나와 이중이었음)
- 섹션 라벨(`공지사항` / `도움말·문의`) 제거 → **동위 카드 4장**: 공지사항 / 자주 묻는 질문 / 1:1 문의 / 내 신청·입금 확인
- `CommunityNewsList.tsx` **삭제** → `CommunityIndex.tsx` 신규. `selectedNoticeId` 배선도 제거(`CommunityDetailPanel`·`NoticeGroupAccordion`)
- 모바일: 카드 탭 → 모달. 공지사항 모달은 **전체 목록 아코디언**(기존엔 개별 1건)
- 카드 높이 상향(`px-5 py-5`, 아이콘 칩 36→44px, 간격 20px) — 4장만 남아 성겨서

### p12 — 질의 7건
`_DEV/재단_확인사항.md` 참조. 7번(현금영수증 발급대기→발급처리)만 구현 완료(커밋 `b167158`).
3번(개인정보처리방침)은 **등록 기능까지 완성** — 아래 참조.

---

## 추가 작업 (2차 요청 외)

### 개인정보처리방침 어드민 등록
- 어드민 `공지·FAQ` 메뉴에 **`개인정보처리방침` 탭** 추가(문서 한 장이라 메뉴 신설 안 함)
- `board/PolicyClient.tsx` — 텍스트 붙여넣기 + **`.txt`/`.md` 파일 불러오기**(전문이 길어 붙여넣기가 번거로움)
- `board/policyActions.ts` `savePolicy` — `site_contents` upsert(key=`privacy_policy`), `/privacy` revalidate
- `lib/adminQueries.ts` `getSiteContentAdmin(key)` 추가
- 공개 `app/privacy/page.tsx` — 기존 "곧 등록됩니다" 고정 문구 → `site_contents` 연동 + `MarkdownRenderer`
- 시드 `30_privacy_policy_content.sql`(빈 행만 생성, 있으면 보존)

### 더미 정리 SQL (오픈 전용, 아직 실행 안 함)
- `_DEV/seeds/29_purge_dummy_open.sql`
- 더미 공지 8건(제목 일치) + 더미 신청(`SCT-27-%`/`SFP-27-%`/`PEA-%`, 참가자·현금영수증·증명서 CASCADE) + 더미 요청(전화 `0101111`/`0102222`)
- FAQ·요금·회차는 실데이터라 제외. 문의는 실제 글 섞일 수 있어 자동 삭제 안 함(주석 처리)
- **공지 날짜가 이상하다는 신고 = 버그 아님**: 8건이 2026-07-03에 시드로 들어갔고 `published_at`만 2025-12~2026-01로 흩뿌려져 있음. 표시는 `published_at ?? created_at`이라 정상 동작

---

## 다음 세션에서 할 것

우선순위 순:

1. **알림톡 골격** — `_DEV/Moosan/api/_lib/alimtalk.ts`가 검증된 솔라피 구현본. 가져올 것:
   라이브러리 방식(외부 엔드포인트 없음) / `alimtalk_logs` + `idempotency_key` UNIQUE(중복 발송 차단) /
   5xx·네트워크만 1회 재시도, 4xx 즉시 실패 / 타임아웃 8초 / best-effort(발송 실패가 입금확인을 막지 않게).
   **단 SMS fallback은 끔** — 국내 문자 발송이 법규 문제로 막혀 있음.
   채널·템플릿 승인 전까지는 env 없으면 조용히 skip하는 스텁으로 두고, 발송 지점 훅만 심어둘 것
   (`setApplicationStatus(paid)` = 참가 확정이 1순위).
2. **증명서 요청·승인 흐름** — `issueCertificate`의 `status === 'completed'` 게이트를 입금확인(paid)으로 완화,
   `cert_type`에 `transfer` 추가(CHECK 확장 시드), 마이페이지 "준비 중" 버튼 → 발급 요청, 발급 관리에 대기 목록.
   발급물(서식) 자체는 재단 서식 수급 후.
3. **회차별 준비 요약 대시보드** — 항목은 재단이 주기로 함. 집계 후보 목록은 `재단_확인사항.md` B-3.
4. **기관 정보 실제값 교체**(`lib/siteMeta.ts`) — 오픈 전 필수. 특히 **입금 계좌가 가짜**.

---

## ⚠️ 사고 기록 — 서버액션 파일 상수 export (전체 500)

`policyActions.ts`(`'use server'`)에서 상수 `PRIVACY_KEY`를 export했다가 **앱 전 라우트가 500**이 났다.

```
Error: × Only async functions are allowed to be exported in a "use server" file
```

- **`tsc --noEmit`도 `next lint`도 못 잡는다.** Next 컴파일(SWC) 단계 제약이라 둘 다 통과한 채로 커밋·푸시됐고 배포본까지 나갔다.
- 조치: 상수를 `board/policyKeys.ts`(일반 모듈)로 분리. 세 곳(액션·클라이언트·페이지)이 거기서 import.
- **규칙: `'use server'` 파일은 async 함수만 export한다.** 상수·타입·헬퍼는 별도 모듈로.
- **검증 규칙 보강: 서버액션 파일을 새로 만들거나 export를 건드렸으면 `curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/` 로 라우트를 한 번 찍어볼 것.** tsc/lint만으로는 부족하다.

---

## 검증 방법 (이 세션에서 쓴 것)

- 기본: `npx tsc --noEmit` + `npx next lint --file <경로>` (dev 실행 중이라 `next build` 금지 — [[verify-with-tsc-when-dev-running]])
- **라우트 헬스체크**: `for p in / /courses /community /application /privacy; do curl -s -o /dev/null -w "%{http_code}" localhost:3000$p; done`
- **라이브 DB 확인**: `.env.local`의 `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`로 REST 직접 조회.
  공개 테이블(`site_contents`·`faqs`·`notices`)만 보인다(applications 등은 RLS로 0건 — 정상).
- **모바일 렌더 확인(중요)**: `resize_window` 툴은 이 환경에서 **CSS 뷰포트를 안 바꾼다**(outerWidth만 변하고 `innerWidth`는 그대로 1442). 대신 **같은 오리진 iframe을 띄워서 확인**:
  ```js
  const f=document.createElement('iframe');
  f.src='/courses'; f.style.cssText='position:fixed;top:0;left:0;width:402px;height:860px;z-index:99999';
  document.body.appendChild(f);
  // f.contentWindow.innerWidth === 398 → iframe 뷰포트 기준으로 md: 브레이크포인트가 정상 적용된다
  ```
  iframe 안에서 카드를 클릭해 모달을 열고 `getBoundingClientRect()`로 열 폭·행 높이·`scrollWidth` 오버플로를 실측했다.
- 오너가 dev를 직접 보므로 평소엔 브라우저 검증 생략([[owner-verifies-live-skip-browser]]) — 이번엔 "저게 뭐냐"는 지적이 나와서 직접 열어봤다. **레이아웃 지적이 나오면 추측하지 말고 열어볼 것.**

---

## 오너 피드백 패턴 (다음 세션이 같은 실수 안 하도록)

- **"우리 스타일로" ≠ "구조를 바꿔라".** 표는 표로 두고 시각 언어만 우리 것으로. 임의로 형태를 바꾸면 반려된다.
- **컴포넌트 형태를 무너뜨리지 말 것.** 원형 칩에 라벨을 붙일 땐 칩 아래에. 가로 필로 바꾸면 원형이 사라져 반려됐다.
- **정렬·여백은 그 자체로 지적 대상.** 열 폭 균형, 셀 높이, 숫자 자리 맞춤까지 맞춰서 내야 한다.
- 오너가 "~라고 말했음"이라고 하면 이미 합의된 사항이다. 되묻지 말고 반영([[owner-word-overrides-own-rules]]).
- 페이지 번호로 지시할 때가 있다 — **PDF 페이지 번호**인지 내가 매긴 항목 번호인지 먼저 맞출 것(이번에 어긋났다).

---

## 현재 상태 / 다음 세션 시작점

- `main` = `f1a1c5c`, 로컬·원격 동일. 미커밋 변경 없음(참조용 미추적 폴더 `_DEV/Moosan`·`ninebridge`·`snowpass` 제외)
- **PDF 2차 수정요청 구현 항목은 전부 끝났다.** 남은 건 위 "다음 세션에서 할 것" 4가지 + 재단 자료 대기
- 실행 대기 SQL: `29_purge_dummy_open.sql`(오픈 직전), `30_privacy_policy_content.sql`(빈 행 생성)
- 실행 완료 SQL: `28_refund_policy_copy.sql`
- 재단에 넘길 문서: `_DEV/재단_확인사항.md` (그대로 전달 가능하게 작성됨)
