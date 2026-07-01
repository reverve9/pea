# [Claude Code 구현 프롬프트] 체육교육회 — Phase 2a: 셸 + 디자인 토큰 + 공용 컴포넌트 이식

## §0. 역할

너는 이 레포(`reverve9/pea`)에서 직접 코드를 작성·커밋·push 하는 구현 에이전트다.
이 프롬프트는 **Phase 2a** 만 다룬다 — 나인브릿지 홈페이지의 **레이아웃 셸 + 디자인 토큰 + 공용 컴포넌트 + 네비게이션**을 이식해 "빈 골격이 사이트처럼 보이는" 기반을 만든다.
**페이지별 실제 콘텐츠(기관소개 텍스트·비용표·달력·게시판 렌더 등)는 이번에 만들지 않는다 — 후속 Phase 2b.** 이번엔 각 네비 경로에 **빈 자리표시자 페이지**만 둔다.
전제: Phase 0b(Next.js 전환)가 완료되어 있다. 설계 맥락은 `체육교육회_설계문서_v1.md`(SoT)를 따르되, 프레임워크는 Next.js, 화면 매핑은 이 프롬프트 §3을 따른다.

---

## §1. 이식 원본 (참조 레포)

로컬 나인브릿지 레포: **`/Volumes/BridgeNine/NINE_DEV/PROJECT/ninebridge`**, 실제 앱은 **`apps/web/`** 하위.
- 이식 대상 파일(참조): `apps/web/app/globals.css`, `apps/web/app/layout.tsx`, `apps/web/components/layout/*`(MainLayout, PWAContainer, PWANavigation, PWAHeader, PWANavBar, PWATopNav), `apps/web/components/common/*`(Button, Badge, WhiteBox, PageTitle, MarkdownRenderer, SNSLinks 등), `packages/ui/src/*`(있으면 단일 앱으로 평탄화해 흡수).
- **주의**: 나인브릿지는 모노레포(`apps/`+`packages/`)다. 우리는 **단일 앱**이므로 `packages/ui` 의존을 걷어내고 컴포넌트를 우리 레포 `components/` 안으로 **복사·평탄화**한다. `@/` 경로 별칭은 우리 tsconfig에 맞게 조정.
- 나인브릿지도 Next App Router + Tailwind v4 라 **변환 없이 이식**된다. `next/image`·`next/font` 등은 그대로 사용 가능(우리도 Next).

---

## §2. 이식 원칙 (사용자 확정 — 4개, 반드시 준수)

1. **디자인은 전부 컴포넌트/토큰화. 페이지 하드코딩 금지.**
   색상 raw 값·픽셀 상수·인라인 스타일을 **페이지 파일에 직접 기입하지 않는다.** 모든 시각 요소는 `@theme` 토큰 + 공용 컴포넌트를 경유한다. (톤 변경 시 한 곳만 고치면 전체 반영되도록.)

2. **반응형 clamp 규칙.**
   - **모드 전환점은 768px 한 곳**(폰↔데스크탑). 이건 의도된 구조 전환이지 "깨짐"이 아님.
   - **데스크탑(≥768, 고정폭 영역)**: 나인브릿지대로 고정. 콘텐츠는 1280 중앙 캡, 초광폭은 양옆 gutter 여백(§2-3 와이드 구조). clamp 불필요.
   - **모바일/태블릿(<768, 단일 컬럼)**: **fluid**. 텍스트·간격·아이콘 **clamp** + 줄길이 **ch 상한** + 아이콘 **em 고정**(텍스트에 묶기) + clamp 중간값에 **rem 섞기**(순수 vw 금지 — 브라우저 zoom 접근성 보존, 예: `clamp(1rem, 0.9rem + 1.2vw, 1.5rem)`).

3. **기본 구조는 디테일까지 나인브릿지 그대로 재활용.** 차별화(협회톤)는 이번에 하지 않는다(후속). 특히 **와이드 구조**(≥xl에서 1280 중앙 고정 + 좌측 gutter macOS풍 음영 + 우측 gutter 여백)는 **확실히 그대로 지킨다.**

4. **폰트(패밀리·사이즈·웨이트)도 나인브릿지 그대로.** 본문 Pretendard, 디스플레이 S-CoreDream(1~9 전체) + Poppins·Montserrat·Raleway·Do Hyeon. `globals.css`의 `@import`·`@font-face`·폰트 클래스 통째 이식. 웨이트·패밀리는 고정, **사이즈만** 원칙 2의 데스크탑 고정/모바일 clamp를 따른다.

> ⚠️ 이번 Phase 는 "나인브릿지 클론에 가까운 골격"이 목표다. 협회용으로 톤을 눌러쓰거나 색/폰트를 바꾸지 말 것 — 그건 사용자가 골격을 눈으로 본 뒤 후속에서 지시한다.

---

## §3. 작업 범위

### 3-1. 디자인 토큰 이식 (`app/globals.css`)
- 나인브릿지 `globals.css` 를 이식: 폰트 `@import`/`@font-face`, `@theme` 블록(브랜드 컬러 `--color-primary-*` 스케일, 애니메이션 토큰), `:root` 변수, 리셋, 폰트 클래스(`.font-score` 등), 커스텀 스크롤바, `.white-box` 등.
- **그대로 가져온다**(협회톤 변경 없음). 우리 프로젝트에 불필요한 것(나인브릿지 전용 이미지 경로 등)만 소거.

### 3-2. 레이아웃 셸 이식 (`components/layout/`)
- `MainLayout` — 3컬럼(좌 gutter | 1280 고정[PWA 500 + Extended 780] | 우 gutter) 구조 **그대로**. 와이드 gutter 음영 포함.
- `PWAContainer` / `PWANavigation`(모바일<768 하단바 + 상단헤더 / 데스크탑≥768 상단네비) / `PWAHeader` / `PWANavBar` / `PWATopNav` 이식.
- **모바일 단일 컬럼에 원칙 2의 clamp 적용**(나인브릿지 원본은 순수 `w-full`이라 clamp 미적용 — 우리가 얹는 개선). 데스크탑 고정폭은 원본 유지.

### 3-3. 네비게이션 항목 교체 (5개)
나인브릿지 네비(HOME·WORX·NEWS·CONNECT 4개)를 **우리 5개로 교체**. 구조·스타일은 유지, 라벨·라우트만 교체:

| 순서 | 라벨 | 라우트 | (영문 보조 표기 예) |
|---|---|---|---|
| 1 | 기관소개 | `/about` | About |
| 2 | 연수안내 | `/courses` | Courses |
| 3 | 연수신청 | `/apply` | Apply |
| 4 | 마이페이지 | `/my` | My |
| 5 | 커뮤니티 | `/community` | Community |

- 모바일 하단바는 5개 항목(아이콘+라벨, lucide-react 단색). 데스크탑 상단네비도 5개.
- 영문 보조 표기(나인브릿지의 "큰 영문+작은 한글" 패턴)는 유지. 위 영문은 예시이며 자연스럽게 조정 가능.
- 라우팅은 **Next App Router 실제 경로**로(나인브릿지의 useState 전환 방식이 아니라 각 라우트 파일 생성). 딥링크·`/admin` 공존 위해 실제 라우트가 맞음.

### 3-4. 공용 컴포넌트 이식 (`components/common/` 또는 `components/ui/`)
- `Button`, `Badge`, `WhiteBox`, `PageTitle`, `MarkdownRenderer`(+ `react-markdown`·`remark-gfm` 의존성), `SNSLinks`, `Maintenance` 등 이식.
- 전부 재사용 컴포넌트로. 페이지가 이걸 조립만 하도록.

### 3-5. master-detail 셸 컴포넌트 (재사용 골격)
- 나인브릿지 NEWS(`PWANotice` + `ExtendedContent`)의 **좌측 리스트 → 우측 상세** 패턴을 **범용 master-detail 셸 컴포넌트**로 추출. 커뮤니티 4종·마이페이지가 이걸 재사용한다(2b에서).
- 이번엔 셸(레이아웃·상태·빈 상태 UI)만. 실제 데이터 바인딩은 2b.

### 3-6. 자리표시자 페이지 (라우트만 뚫기)
아래 라우트에 **빈 자리표시자 페이지**만 생성(제목 + "준비중" 수준). 실제 콘텐츠·데이터·기능은 **전부 2b 이후**:
- `/`(홈), `/about`, `/courses`, `/apply`, `/my`, `/community`
- `/admin`(기존 자리표시자 유지)
- 각 페이지는 §3-2 셸 안에 들어가고, §3-4 공용 컴포넌트로 제목 정도만 렌더.

---

## §4. 금지 사항
- ❌ 협회톤 차별화(색·폰트·질감 변경) — 나인브릿지 그대로. 후속 지시 대기.
- ❌ 페이지 실제 콘텐츠·시드 데이터 렌더(기관소개 텍스트/비용표/달력/게시판 목록) — 전부 2b.
- ❌ 기능 로직(신청폼 계산·OTP·어드민 인증·CMS 쓰기·Supabase mutation).
- ❌ 페이지 파일에 raw 색상/픽셀/인라인 스타일 직접 기입(원칙 1 위반).
- ❌ 모노레포화(단일 앱 유지). `packages/*` 의존 남기지 말 것 — 컴포넌트는 우리 레포 안으로 평탄화.
- ❌ `_DEV/seeds/**` 수정.
- ❌ 이 프롬프트에 없는 판단 필요 시 임의 진행 — **보고 후 대기**(사용자가 이 챗에서 결정).

---

## §5. 착수 전 확정 사항 (모두 결정됨 — 질문 없이 착수)
- 이식 원본: 로컬 `/Volumes/BridgeNine/NINE_DEV/PROJECT/ninebridge`(`apps/web/`).
- 스택: Next App Router + Tailwind v4 + TS + npm, 단일 앱. (나인브릿지와 동일 → 무손실 이식)
- 4원칙(§2) 준수. 특히 와이드 1280 중앙+gutter 구조 그대로, 폰트 그대로, 페이지 하드코딩 금지, 모바일 clamp.
- 네비 5개(§3-3): 기관소개/연수안내/연수신청/마이페이지/커뮤니티. 실제 라우트.
- 범위: 셸+토큰+공용컴포넌트+master-detail 셸+자리표시자 라우트까지. 페이지 콘텐츠·기능은 제외.
- 협회톤 차별화 안 함(후속).

---

## §6. 커밋 방식
- 논리 단위 커밋(예: `feat: port ninebridge design tokens + fonts`, `feat: port main layout shell (1280 + gutters)`, `feat: nav 5 items with app router`, `feat: common components`, `feat: master-detail shell`, `feat: placeholder route pages`).
- 영어 prefix + 간결 설명. main push → Vercel 자동배포 확인.

---

## §7. 핸드오프 예상 출력 (완료 보고에 포함)
- 이식·생성한 파일 목록(경로), `packages/*` 의존 제거 확인(단일 앱).
- `npm run build` 통과, 배포 URL에서 라이브 확인.
- **와이드/데스크탑/모바일 3폭 스크린샷 또는 확인**: (a) 초광폭에서 1280 중앙+gutter, (b) 데스크탑 500+780 2페인, (c) 모바일 단일컬럼+하단바. 셸이 나인브릿지대로 서는지.
- 모바일 단일컬럼에 clamp 적용됨(중간 폰 너비에서 텍스트 점프 없음) 확인.
- 네비 5개 동작(각 라우트 이동), 자리표시자 6개 페이지 렌더.
- 폰트(Pretendard/S-CoreDream 등) 적용 확인.
- 원칙 1 준수(페이지 파일에 raw 스타일 없음) 자가 점검 결과.
- 미해결/주의(나인브릿지에서 가져오다 우리 단일앱과 충돌한 부분 등).

---

## §8. 다음 블록 예고
- 완료 보고 → 이 챗에서 골격을 눈으로 검토(와이드 구조·clamp·네비). 필요 시 조정 지시.
- 그다음 **Phase 2b(페이지 콘텐츠 골격)** — 매핑표대로 각 페이지에 시드 데이터를 **읽기 전용** 렌더: 기관소개(`site_contents`), 비용표(`price_items`), 일정 달력(`sessions`), 커뮤니티(`notices`/`faqs`/`inquiries`/`certificate_requests` 리스트→상세, master-detail 셸 재사용). 신청폼·마이페이지는 자리표시자 유지(기능은 Phase 3·4). 2b 완료 후 사용자가 라이브 보며 뺄 것/넣을 것 결정.
