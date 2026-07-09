# 성능 감사 & 안정화 계획 (그랜드오프닝 전)

> 작성: 2026-07-09 · 베타 중 "로컬·배포 둘 다 반응속도 저하" 지적에 대한 원인 조사.
> **이 문서는 진단·계획서다. 코드는 아직 안 건드림.** 안정화 단계에서 이 순서대로 착수.
> 조사 범위: 데이터페칭·렌더 / 이미지·폰트 / Supabase쿼리·DB / 번들·클라이언트비용 4축 전수. 모든 항목 파일:라인 근거 확보.

---

## 결론 (한 줄)

느림의 뿌리는 **버그가 아니라 아키텍처 3가지**다:
1. **전 공개 페이지가 통짜 `'use client'` + 마운트 후 클라이언트 fetch, 캐시 없음** → 페이지마다 "빈 화면 → JS 로드 → 스피너 → 네트워크 왕복 → 데이터", 이동할 때마다 재fetch.
2. **폰트가 원격 CDN에서 `@import` 체인으로 렌더 블로킹 로드** (한글 S-CoreDream 9종 ≈1.75MB + Montserrat/Raleway 전 웨이트 + Pretendard + Google).
3. **히어로·카드 이미지가 `next/image`가 아니라 CSS `background-image`** → 원본(2100×600)을 리사이즈·webp 없이 풀사이즈 다운로드.

이 3개가 **로컬·배포 양쪽 모두** 느리게 만드는 공통 원인이다. (로컬이 더 심한 건 `reactStrictMode` dev 이중 fetch가 얹혀서.)
**다행히 DB 인덱스·Supabase 클라이언트 싱글턴·리스트 페이지네이션·cqi 시스템은 이미 양호** — 여기는 손댈 필요 없음(아래 §반증).

---

## 심각도별 발견 (근거 포함)

### 🔴 높음

**H1. 통짜 client 페이지 + 클라이언트 fetch 워터폴 (SSR 미사용)**
- 전 공개 페이지 `'use client'`: `app/about|application|community|courses|my|program|privacy/page.tsx:1`, `fill/[token]/page.tsx:1`. 셸도 `AppShell.tsx:1`.
- 훅 `lib/useQuery.ts:8-28` — 마운트 후 1회 client fetch, `loading` 항상 true로 시작 → 무조건 스피너 선행.
- `@supabase/supabase-js` 정적 import(`lib/supabase.ts:1,13`)가 **모든 공개 라우트 클라 번들에 포함**.
- 모범 사례 이미 존재: 공지 상세 `app/community/notices/[id]/page.tsx:22,28`는 서버 컴포넌트 + `getNoticeById` 서버 fetch. 이걸 확장하면 됨.
- 영향: 초기 콘텐츠가 항상 네트워크 왕복 뒤에 뜸. **양쪽 다 느림.**

**H2. fetch 캐시 전무 → 라우트 이동마다 재fetch**
- `lib/useQuery.ts`는 `useState`만, 모듈/전역 캐시 없음(SWR·react-query 미설치). 언마운트 시 데이터 폐기.
- 교차 페이지 중복: `getSessions`/`getSessionAvailability`가 `courses/page.tsx:28-29`, `JikmuApplyForm.tsx:156,183`, `JayulApplyForm.tsx:153-154`에서 각각 재호출.

**H3. 폰트 — next/font 미사용, 원격 CDN `@import` 렌더 블로킹**
- `app/globals.css:1-7` `@import` 체인: Pretendard(jsdelivr) + Google Do Hyeon/Poppins/**Montserrat 9웨이트**/**Raleway 9웨이트** + Pretendard 동적서브셋.
- `globals.css:11-64` S-CoreDream `@font-face` **9종**(projectnoonnu), 각 woff **≈355KB**, 실사용 5웨이트 ≈**1.75MB**.
- `app/layout.tsx`엔 폰트 로직 0 → 자체호스팅·preload·자동서브셋·CLS방지 전부 못 받음. `font-display:swap` → FOUT.
- **낭비**: Montserrat/Poppins/Do Hyeon은 사실상 `app/dev/type` 데모 1곳에서만 쓰는데 전역 `@import`라 모든 페이지가 로드.

**H4. 히어로·카드 이미지 = CSS background-image (미최적화)**
- `components/features/DuotoneHero.tsx:29,36`, `HomeCourses.tsx:56` — `backgroundImage: url(...)`.
- 원본 2100×600 JPG(`/courses|program|application|community/hero.jpg` 115~150KB)를 모바일 ~380px폭에 표시 → 4~5배 오버사이즈. webp/avif·lazy 없음.
- public 이미지 총 ≈1.4MB.

**H5. 어드민 목록 over-fetch + 서버 페이지네이션 전무** (어드민 위주, 데이터 증가 시 악화)
- `lib/adminQueries.ts:75-81` `getAllApplications` — 전건 × 참가자 **전체 필드(암호화 birth_back_enc·rentals JSON 포함)** + sessions→courses 2단 중첩, `.limit()/.range()` 없음, 전량 클라 직렬화(`applications/page.tsx`).
- 서버 페이지네이션 전무: 전 코드 `.range(` 0건, `.limit(`은 `cashReceipt.ts:98` 단건뿐. 정산은 전건 받고 **클라 slice만**(`SettlementsClient.tsx:105`).

### 🟡 중간

- **M1. `loading.tsx`/Suspense 전무** — `find app -name loading.tsx` 0건. 라우트 전환 시 서버 스트리밍 로딩 셸 없음 → "빈 화면→JS→스피너" 지각 체인.
- **M2. `session_availability()` RPC 매 조회 실시간 전량 집계** — `seeds/14_session_availability.sql:14-30` applications LEFT JOIN + GROUP BY, 카운터 캐시 없음. 캘린더·신청폼 hot path(`lib/queries.ts:55`). `getSessionOccupancy`(`capacity.ts:22`)도 동성격.
- **M3. react-markdown+remark-gfm / vaul 정적 import** — `MarkdownRenderer.tsx:4-5`, `DetailContainer.tsx:4`. 코드분할 전무(`next/dynamic`·`React.lazy` 0건). micromark 체인 수백KB가 상시 번들.
- **M4. 디바운스 없는 resize 리스너 다수** — `application/page.tsx:148`, `community/page.tsx:45`, `MasterDetail.tsx:52`, `PWANavigation.tsx:28` 외. 리사이즈마다 `setState`→전체 리렌더. `innerWidth<768` 분기는 CSS/matchMedia로 대체 가능.
- **M5. `ApplicationsClient.tsx` 무메모 파생값** — `:118-133` reqFlags Map 매 렌더 재구축, `:147-166` filter 매 렌더, `:174-296` columns 매 렌더 재생성. 검색어 입력마다 O(n). (DOM은 15행 페이지네이션이라 완화)
- **M6. lucide-react `optimizePackageImports` 미설정** — 46개 파일 barrel named import, dev 컴파일/HMR 지연. 한 줄로 완화.
- **M7. 정렬키 인덱스 누락** — `applications.deposit_confirmed_at`(정산 정렬 `adminQueries.ts:487`), inquiries/refund/modification.created_at, notices 전반, session_price_overrides.session_id. (현재 소량이라 체감 낮음)
- **M8. `reactStrictMode: true` dev 이중 실행** — `next.config.ts:4`. useQuery fetch 2회·effect 2회. **로컬 체감 저하에 직접 기여, 프로덕션 0.**
- **M9. `my/page.tsx` 973줄 / hook 39개 단일 클라 모놀리스** — 통째 로드·리렌더 부담, 유지보수성.

### 🟢 낮음 / 이미 양호 (§반증 — 여기 시간 쓰지 말 것)

- Supabase 클라이언트 **싱글턴 3종 정상**(`supabase.ts:15`, `supabaseServer.ts:14`, `supabaseAdmin.ts:20`). 문제 아님.
- **핵심 필터 인덱스 전부 존재**: application_no·session_id·status·phone·created_at·is_waitlisted·participants.application_id 등(`01_schema.sql:301-330`, `13_application_waitlist.sql`). 병목은 인덱스 부재가 아니라 over-fetch.
- 관리 리스트 **대부분 페이지네이션됨**(`AdminList.tsx:55` 15행, community/settlement slice). DOM 작음. 가상화 불필요.
- **cqi/clamp 텍스트 스케일 = 100% 순수 CSS**(`Text.tsx:30-73` arbitrary 클래스, ResizeObserver 0건). JS 리렌더 유발 없음 — 무해.
- **xlsx 동적 import**(`excel.ts:4`) — 양호. 어드민 내보내기 시에만 420KB 로드.
- 신청폼 localStorage 임시저장은 **버튼 수동·마운트 1회**(`JikmuApplyForm.tsx:167,263`) — 키입력마다 아님. 문제 아님.
- ScheduleCalendar 핵심 계산 `useMemo` 적용(`:139,150`). 인라인 style 재생성만 소폭(n 작음).

---

## 안정화 실행 계획 (ROI 순)

### Tier 0 — 즉효·저위험 (수 시간, config·삭제 위주)
- [ ] `next.config` 보강: `experimental.optimizePackageImports: ['lucide-react']`, `images.formats: ['image/avif','image/webp']`. (M6, H4 일부)
- [ ] **안 쓰는 폰트 @import 제거**: Montserrat/Poppins/Do Hyeon 전역 로드 삭제(데모 전용). S-CoreDream도 실사용 웨이트만 남김. (H3 즉효 — 체감 큰 것 대비 위험 최소)
- [ ] `reactStrictMode` 유지하되 로컬 dev 이중 fetch는 useQuery 서버화(Tier 2)로 근본 해소. (M8)

### Tier 1 — 큰 체감 개선 (중간 공수)
- [ ] **폰트 next/font 전환**: S-CoreDream/Raleway 자체호스팅 + `next/font/local`·preload·subset. FOUT/CLS 제거. (H3)
- [ ] **히어로·카드 이미지**: `_DEV/bake_hero.py`로 크기별(모바일/데스크탑) + webp/avif 굽기, 또는 `next/image`로 전환. (H4)
- [ ] **라우트별 `loading.tsx`** 추가 — 서버 스트리밍 로딩 셸. (M1)
- [ ] 콘텐츠 전용 페이지 **서버 컴포넌트 전환**: `about`(hook 0개, 최적 후보)부터 → `program`(fetch 없음) → `courses`/`community`. (H1)

### Tier 2 — 구조 개선 (큰 공수, 신중히)
- [ ] **데이터 페칭 서버화 or 전역 캐시**: useQuery를 서버 컴포넌트 fetch로 대체(우선) 또는 SWR/react-query 도입해 라우트 캐시. supabase-js가 공개 번들에서 빠짐. (H1·H2)
- [ ] **어드민 목록/상세 쿼리 분리 + 서버 페이지네이션**: 목록엔 참가자·중첩 제외 경량 select + `.range()`, 상세 열 때만 참가자 로드. (H5)
- [ ] `session_availability` **카운터 컬럼 or 캐시**(트리거로 잔여 인원 유지) — 매 조회 집계 제거. (M2)
- [ ] react-markdown/vaul **`next/dynamic`** 지연 로드. (M3)
- [ ] resize 리스너 → **CSS/`matchMedia`+debounce**로 정리. (M4)
- [ ] `ApplicationsClient` 파생값 **`useMemo`**(reqFlags/filtered/columns). (M5)
- [ ] `my/page.tsx` **컴포넌트 분해**. (M9)
- [ ] 누락 인덱스 추가(정산 커지면): `deposit_confirmed_at` 등. (M7)

### 측정 (착수 전/후 비교 기준)
- [ ] 배포본 Lighthouse(모바일) LCP/TBT/CLS, 실제 폰트·이미지 전송량(Network 탭), 라우트 이동 시 재fetch 여부. Tier마다 재측정.

---

## 참고
- 렌더 방침 메모리(`pea-rendering-strategy`): "현재 클라이언트 fetch 유지, SSR은 후속 페이즈 페이지별 선별" — **이 안정화 단계가 그 후속 페이즈**다. H1이 여기에 해당.
- `_DEV/참고이미지/실사/`에 최대 19MB 원본 다수 — **서빙 대상 아님**(런타임 무관), git 용량 요인일 뿐.
