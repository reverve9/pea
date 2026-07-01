# [Claude Code 구현 프롬프트] 체육교육회 — Phase 0: 부트스트랩

## §0. 역할

너는 이 레포에서 직접 코드를 작성·커밋·push 하는 구현 에이전트다.
이 프롬프트는 **Phase 0(부트스트랩)** 만 다룬다. 스키마·비즈니스 로직·UI 기능은 후속 Phase 다.
설계 전체 맥락은 `체육교육회_설계문서_v1.md`(SoT)를 따른다. 충돌 시 이 프롬프트의 §3 확정값이 우선.

---

## §1. 작업 범위

현재 레포에는 기본 Vite 템플릿 수준(README/.gitignore/기본 scaffold)만 있다. 그 위에 단일 앱 부트스트랩을 구성한다.

**1-1. 스택 셋업**
- Vite + React 19 + TypeScript + Tailwind CSS 구성. (기존 템플릿 설정과 충돌하면 정리하되, 의도된 동작 유지)
- 의존성 설치:
  - 런타임: `@supabase/supabase-js`, `react`, `react-dom`, `react-router-dom`, `react-hook-form`, `zod`, `@hookform/resolvers`, `lucide-react`
  - 개발: `typescript`, `vite`, `@vitejs/plugin-react`, `tailwindcss`, `postcss`, `autoprefixer`, `@types/react`, `@types/react-dom`, `@types/node`, `eslint` + 관련 플러그인
- Tailwind 초기화(`tailwind.config`, `postcss.config`, `index.css`에 디렉티브) 및 동작 확인용 최소 스타일.

**1-2. 디렉토리 구조**
```
/src
  /lib        # supabase 클라이언트, phone util 등 공용
  /pages      # 라우트 단위 (지금은 빈 Home, /admin 자리표시자만)
  /components # 공용 컴포넌트 (지금은 비움/최소)
  main.tsx, App.tsx, index.css
/api          # Vercel 서버리스 스켈레톤 (빈 health 핸들러 1개만)
  /_lib       # 서버 공용 util 자리 (지금은 비움 또는 placeholder)
vercel.json
.env.example
```

**1-3. Supabase 클라이언트**
- `src/lib/supabase.ts` — `createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)`. 환경변수 없을 때 명확한 에러 throw.

**1-4. 라우팅 + 자리표시자 페이지**
- `react-router-dom`으로 최소 라우팅. `/` (Home 자리표시자, "체육교육회" 텍스트 + Tailwind 적용 확인용), `/admin` (로그인 자리표시자 — 실제 인증은 후속 Phase, 지금은 빈 화면).
- 비즈니스 로직·실데이터 호출 금지. 렌더 확인용 최소 마크업만.

**1-5. `/api` 서버리스 스켈레톤**
- `api/health.ts` — `{ ok: true }` 반환하는 헬스 핸들러 1개만. (`@vercel/node` 시그니처)
- 실제 OTP·알림톡·푸시 등 비밀키 쓰는 핸들러는 만들지 않는다(후속 Phase).

**1-6. `vercel.json` (SPA rewrite, /api 제외)**
- SPA 라우팅용 rewrite를 두되 `/api/*`는 가로채지 않게 구성:
```json
{
  "rewrites": [
    { "source": "/api/(.*)", "destination": "/api/$1" },
    { "source": "/(.*)", "destination": "/index.html" }
  ]
}
```
(또는 동등 효과의 구성. `/api` 서버리스가 rewrite에 먹히지 않는 것이 핵심.)

**1-7. env 템플릿**
- `.env.example` 에 키 이름만(값 없음):
  ```
  VITE_SUPABASE_URL=
  VITE_SUPABASE_ANON_KEY=
  VITE_SITE_URL=
  ```
- 실제 `.env`/`.env.local`은 커밋 금지(.gitignore 확인).

**1-8. PWA 셋업**
- `vite-plugin-pwa` 추가 + 최소 manifest(앱명 "체육교육회", 기본 아이콘 자리, theme color) + 자동 service worker 등록. 빌드 시 SW가 생성되는 수준까지만.

**1-9. 빌드 통과 확인**
- `npm run build`(= `tsc -b && vite build`)가 타입에러 없이 통과해야 한다. 통과를 Phase 0 완료 기준으로 삼는다.

---

## §2. 금지 사항

- **DB 스키마/테이블/RLS/마이그레이션 생성 금지** — 전부 Phase 1.
- **비즈니스 로직 금지** — 신청 폼, 가격계산, 인증, 게시판, CMS 등 일절 구현하지 않는다.
- **결제/PG 관련 코드 금지** — 이 프로젝트는 무통장+수동 입금확인. tosspayments/cookiepay 등 일절 도입 금지.
- **비밀키를 코드/레포에 넣지 말 것** — service_role key, SOLAPI, VAPID 등은 Phase 0에서 다루지 않는다. `.env*` 커밋 금지.
- **참조 프로젝트(무산/snowpass/vite-temp) 코드를 통째 복사하지 말 것** — Phase 0은 깨끗한 스캐폴드만. 이식은 후속 Phase에서 선별적으로.
- 임의로 범위를 넓혀 페이지·기능을 추가하지 말 것. 위 §1 항목에 한정.

---

## §3. 착수 전 확정 사항 (질문 금지 — 아래 값대로 진행)

- 레포 구조: **단일 앱**(모노레포 아님). 루트에 Vite 앱 + `/api`.
- 기존 레포 상태: **기본 템플릿 수준** → 그 위에 스캐폴드. 충돌 설정은 정리.
- 스택: Vite + React 19 + TS + Tailwind + supabase-js + react-hook-form + zod 확정.
- 배포 대상: Vercel(임시 도메인). 도메인은 `VITE_SITE_URL` env로 분리(추후 교체).
- 관리자 경로: `/admin`(서브도메인 아님). Phase 0은 자리표시자만.
- Node: 22.x 기준으로 구성.
- 패키지 매니저: npm.

---

## §4. 커밋 방식

- Phase 0 작업을 논리적으로 정리해 커밋. 메시지 예: `chore: bootstrap Vite+React+TS+Tailwind+Supabase scaffold (Phase 0)`.
- 완료 후 원격에 push.
- `.env*`·비밀값이 커밋에 포함되지 않았는지 push 전 확인.

---

## §5. 핸드오프 예상 출력 (완료 보고에 포함할 것)

- 설치된 의존성 목록(런타임/개발 구분)과 최종 `package.json` 요약.
- 생성·변경한 파일 트리.
- `npm run build` 통과 여부(로그 요약).
- `vercel.json` 최종 내용.
- 로컬 실행 방법(`npm install` → `.env.local`에 넣을 키 이름 → `npm run dev`).
- 미해결/주의 사항(있으면).

---

## §6. 다음 블록 예고

- Phase 0 완료 보고를 받으면, 이 챗에서 **별도 검증 프롬프트**(빌드·배포·라우팅·`/api/health` 확인)를 보낸다. 이 턴에서 자체 검증까지 시도하지 말 것 — 빌드 통과 확인까지만 하고 보고.
- 이후 Phase 1(스키마+시드)은 Supabase 프로젝트가 Active 된 뒤 진행한다. (현재 Supabase 측 다중 리전 장애로 신규 프로젝트 생성이 지연 중 — Phase 0 코드 작업에는 영향 없음.)
