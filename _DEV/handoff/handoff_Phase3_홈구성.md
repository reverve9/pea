# 핸드오프 — Phase 3 홈페이지 구성 (좌/우)

작성 2026-07-02. 홈페이지 좌·우 영역 구성 세션 요약 + 다음 세션 이어가기 포인트.

## 0. SSOT / 상태
- **SSOT = origin/main `8368102`** (reverve9/pea). Vercel 자동배포(pea-ten.vercel.app).
- dev: `cd "/Volumes/BridgeNine/NINE_DEV/PROJECT/PEA" && npm run dev` → localhost:3000.
- 워크플로: UI 변경 = 로컬 dev 확인 → 사용자 컨펌 → 커밋+푸시. 확인 전 push 금지.

## 1. 이번 세션 커밋 (오래된→최신)
- `79d2b23` 홈 우측 브랜드 히어로(HomeExtended)
- `c1ebfb7` 홈 좌측 인사말(아이덴티티) + ImageSlider(cqi 반응형)
- `a3052e2` 홈 푸터(입금계좌 포함) + 슬라이더 2:1·중앙크롭
- `8368102` **연수 코스 카드(크로스 컬럼 +확장) + 스티키 네비 수정** (최신)

## 2. 홈 구성 현황
### 우측(확장 페인, 데스크탑 전용) = `components/features/HomeExtended.tsx`
- 나인브릿지 홈 우측 스타일: 모노 로고(`public/logo/pea-logo-mono.png`) + 소개글(계획서0630 2p) + `연수 신청하기`CTA(→/apply) + SNS 버튼.

### 좌측(PWA 페인, 데·모 공통) = `app/page.tsx` main
순서: **HomeGreeting → HomeCourses → HomeFooter**
- `HomeGreeting.tsx`: 인사말(계획서 2p) = 카드 없는 아이덴티티 타이포(그라디언트 글로우 + 대형 헤드라인, "인사말" 라벨 없음). **이미지 슬라이더는 제거**(ImageSlider.tsx는 재활용 위해 보존).
- `HomeCourses.tsx`: 연수 코스 2종 요약. **나인브릿지 홈 "2열 크로스 컬럼 확장"** — 좌=직무 이미지(+우상단)/우=자율 이미지(+좌상단). +클릭 시 해당 코스 상세가 **반대편 이미지 위**에 슬라이드 오버레이(+→× 회전). 내용=계획서 **10페이지**(신청대상·NEIS학점·자율 조건) pill+라벨/값 스펙. 색: 직무=네이비#1e3a5f / 자율=그린#3f7d5a. "두 가지 방식으로…" 카피(font-score)는 이미지 위. 사진 미수급→브랜드 플레이스홀더.
- `HomeFooter.tsx`: **홈에만** 배치(나인브릿지 PWAFooter 형식). 회색박스+모노로고+기관정보(주소·대표자·**입금계좌**·개인정보보호책임자·고객센터/팩스·이메일)+SNS+저작권. ⚠값 전부 임의 placeholder(`ORG` 객체, 후속 site_settings 연동).

## 3. 반응형 컨벤션 (⭐ 필수)
- PWA 페인 폭 = ~320~500 유동 → 500 고정. 고정 px·`sm:`(뷰포트) 분기 **금지**.
- `app/page.tsx` 홈 래퍼에 `containerType: inline-size` 선언 → 하위 전부 **cqi clamp**(텍스트·패딩, max=500px 기준 캡). 이미지=aspect-ratio. 상세 [[pea-taxonomy-program-vs-course]]·[[snowpass-is-content-reference]] 메모리.
- `PWANavigation` main 에 `min-h-0` 추가 → main 내부 스크롤, 헤더+상단네비 고정(셸 공통 변경, 다른 페이지도 확인 필요).

## 4. ⏭️ 다음 세션 이관 문제 (2건)

### 4-A. 좌측 섹션 구분 강화 (최우선)
**문제**: 히어로(인사말 HomeGreeting) 섹션과 연수종류(HomeCourses) 섹션의 **시각적 구분이 너무 약함** — 스크롤 시 두 섹션이 붙어 보여 경계가 모호.
- 해결 방향(예): 섹션 간 여백/구분선/배경톤 차이/섹션 헤더(작은 라벨)·앵커, 또는 연수 코스 위 소제목. 카드 남발 금지(인사말은 카드 아님 유지) — [[snowpass-is-content-reference]] 톤.
- 반응형 컨벤션(§3) 지키며. 나인브릿지 홈은 섹션마다 넉넉한 상하 패딩 + 그라디언트 글로우로 구분함(참고).

### 4-B. 스티키 상단 메뉴 안 됨 (미해결·이관)
**문제**: 좌측(PWA 페인) 스크롤 시 상단 네비(PWATopNav)가 고정 안 됨. 이번에 `PWANavigation`의 `main`에 `min-h-0` 추가(커밋 8368102)했으나 **여전히 안 됨** → 원인 다른 데 있음.
- **원인 추정**: `AppShell.tsx`의 PWA 래퍼 구조. `#pwa-wrapper`(overflow-y-auto) 안의 `bg-white ... overflow-x-hidden` div가 문제일 가능성 큼 — CSS 스펙상 overflow-x=hidden이면 overflow-y가 auto로 계산되어 **bg-white가 sticky의 스크롤 컨테이너가 되는데, bg-white는 min-h-screen이라 콘텐츠만큼 자라며 스스로 스크롤하지 않음** → 실제 스크롤은 #pwa-wrapper에서 나는데 sticky는 bg-white 기준이라 같이 밀려남.
- **시도해볼 것**: (a) bg-white의 `overflow-x-hidden` 제거 또는 다른 방식으로 가로 클립, (b) 스크롤 컨테이너를 한 곳으로 명확히(예: bg-white에 h-full+overflow-y-auto, #pwa-wrapper는 overflow 제거), (c) 또는 헤더+topnav를 스크롤 밖(고정)으로 빼고 `main`만 스크롤(min-h-0는 넣었으니 main 내부 스크롤이 실제로 도는지 devtools로 확인). ⚠ AppShell/PWANavigation은 셸 공통 → 전 페이지 스크롤 회귀 테스트 필수. `MasterDetail.tsx`·`ScheduleCalendar.tsx`는 수정 금지(CLAUDE.md).

## 5. 남은 홈 작업(그 다음)
- 사진 수급 시: HomeCourses 타일 이미지(`public/home/course-jikmu.jpg`,`course-jayul.jpg`), HomeExtended 로고 확인.
- 실제 기관정보(주소·대표자·입금계좌·연락처) → HomeFooter `ORG` 교체.
- (선택) 다가오는 차수 위젯 — 처음엔 넣기로 했으나 이번엔 연수 코스 2종만. 필요 시 추가 검토.
- 이후 로드맵: 프로그램/연수안내 페이지 콘텐츠([[pea-roadmap]]), 신청폼·어드민=[[snowpass-reference]].

## 6. 참고
- 계획서 PDF = `_DEV/참고이미지/체육교육회 홈페이지 계획안 0630.pdf`(29p, CID라 이미지 렌더로만 읽힘, PyMuPDF `scratchpad/render_pdf.py` 식). 10p=연수신청 선택(직무/자율 조건), 2p=소개글/인사말.
- 나인브릿지 소스 = `_DEV/ninebridge/apps/web/`(홈 좌=`components/pwa/PWAHome.tsx`, 우=`components/extended/ExtendedHome.tsx`, 푸터=`components/pwa/PWAFooter.tsx`). **내용/구조 참고만, PEA 셸 유지**.
- 로고 모노=`public/logo/pea-logo-mono.png`(밝은배경용, 1890x400).
