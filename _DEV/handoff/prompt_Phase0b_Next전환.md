# [Claude Code 구현 프롬프트] 체육교육회 — Phase 0b: 프레임워크 전환 (Vite → Next.js)

## §0. 역할

너는 이 레포에서 직접 코드를 작성·커밋·push 하는 구현 에이전트다.
이 프롬프트는 **Phase 0b(프레임워크 재부트스트랩)** 만 다룬다 — 기존 Vite 스캐폴드를 걷어내고 **Next.js App Router**로 빈 껍데기를 다시 세운다.
UI 컴포넌트·톤앤매너·달력·신청폼 등 실제 기능은 **후속 Phase(2~)** 다. 이 턴에서는 만들지 않는다.
설계 전체 맥락은 `체육교육회_설계문서_v1.md`(SoT)를 따른다. 단 **프레임워크는 Vite가 아니라 Next.js로 변경됨**(이 프롬프트 §3이 SoT의 Vite 기술을 덮어쓴다).

---

## §1. 작업 범위

현재 레포(`reverve9/pea`)에는 Phase 0에서 만든 **Vite + React 19 스캐폴드**가 커밋돼 있다(`86f3ae4`). 이걸 **같은 레포에서** Next.js로 갈아엎는다. 새 레포 만들지 않는다.

### 1-1. 제거 대상 (Vite 스캐폴드 일체)
- `vite.config.ts`, `index.html`, `src/main.tsx`, `src/App.tsx`, Vite 전용 `tsconfig` 설정, `@vitejs/plugin-react`, `vite`, `vite-plugin-pwa` 등 Vite 의존성.
- 기존 `vercel.json`의 Vite/SPA rewrite 구성(아래 1-6에서 Next용으로 대체 또는 제거).

### 1-2. 보존 대상 (절대 삭제 금지)
- **`_DEV/seeds/01_schema.sql`, `_DEV/seeds/02_seed_core.sql`** — 이미 Supabase에 적용된 스키마 원본. 그대로 둔다.
- `_DEV/**` 하위 기타 문서가 있으면 보존.
- `.git/` 히스토리(같은 레포 유지).
- README 등 프로젝트 메타 문서는 내용만 Next 기준으로 갱신.

### 1-3. 스택 셋업 (Next.js App Router)
- **Next.js(App Router, `app/` 디렉토리)** + **TypeScript** + **npm**. 단일 앱(모노레포 아님).
- **Tailwind CSS v4** (`@theme` CSS-first 방식 — 나인브릿지와 동일하게, 후속 Phase 토큰 무손실 이식용). PostCSS 플러그인 `@tailwindcss/postcss` 사용.
- 런타임 의존성: `next`, `react`, `react-dom`, `@supabase/supabase-js`, `react-hook-form`, `zod`, `@hookform/resolvers`, `lucide-react`.
- 개발 의존성: `typescript`, `@types/react`, `@types/react-dom`, `@types/node`, `tailwindcss@^4`, `@tailwindcss/postcss`, `postcss`, `autoprefixer`, `eslint`, `eslint-config-next`.
- **참고(이식 아님)**: 로컬 나인브릿지 레포 `/Volumes/BridgeNine/NINE_DEV/PROJECT/ninebridge` 의 `apps/web/` 이 같은 스택(Next App Router + Tailwind v4)이다. **이번 Phase에서는 구조·설정 방식만 참고**하고, 컴포넌트·디자인 토큰 이식은 하지 않는다(Phase 2에서 함). `globals.css`는 **폰트 import + Tailwind 지시문 + 최소 리셋**까지만. 나인브릿지 브랜드 컬러·화이트박스·애니메이션 토큰은 **넣지 않는다**(Phase 2).

### 1-4. 디렉토리 구조 (목표)
```
/app
  layout.tsx            # 루트 레이아웃 (html/body, metadata, globals.css import)
  page.tsx              # / 자리표시자 ("체육교육회" 텍스트 + Tailwind 동작 확인)
  globals.css           # Tailwind v4 @import + 최소 리셋 (브랜드 토큰 없음)
  /admin
    page.tsx            # /admin 자리표시자 (빈 화면, 인증은 후속 Phase)
  /api
    /health
      route.ts          # GET → { ok: true }
/lib
  supabase.ts           # 브라우저용 anon 클라이언트
/public                 # 파비콘 등 정적 자산 자리
next.config.ts
tsconfig.json
postcss.config.mjs
.env.example
package.json
```

### 1-5. Supabase 클라이언트 (`lib/supabase.ts`)
- `createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!)`.
- 환경변수 없을 때 명확한 에러 throw(빌드/런타임에 누락 즉시 인지).
- **브라우저에서 쓰는 클라이언트만.** service_role 클라이언트는 이번에 만들지 않는다(후속 `/api` Phase).

### 1-6. `/api` = Next Route Handlers
- 설계문서의 Vercel `/api/*`(OTP·알림톡·푸시·암복호화)는 **전부 Next Route Handlers**(`app/api/*/route.ts`)로 통합한다. **이번 Phase에서는 `app/api/health/route.ts` 하나만** 만든다(`GET` → `NextResponse.json({ ok: true })`). 나머지 비밀키 핸들러는 후속 Phase.

### 1-7. 환경변수 (env) — 접두사 전환 핵심
Vite의 `VITE_*` → Next의 `NEXT_PUBLIC_*`(브라우저 노출) / 서버 전용은 무접두사.

`.env.example` 에 아래를 명시(값은 비움):
```
# 브라우저 노출 (anon)
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
NEXT_PUBLIC_SITE_URL=

# 서버 전용 (절대 NEXT_PUBLIC_ 붙이지 말 것 — 후속 Phase에서 사용)
SUPABASE_SERVICE_ROLE_KEY=
SOLAPI_API_KEY=
SOLAPI_API_SECRET=
SOLAPI_SENDER=
VAPID_PUBLIC_KEY=
VAPID_PRIVATE_KEY=
```
- 코드는 위 이름 전제로 작성.
- **주의(사람 작업 영역)**: Vercel 대시보드의 기존 `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` 는 사람이 `NEXT_PUBLIC_*` 이름으로 갱신해야 한다. **Claude Code는 Vercel 대시보드를 건드리지 않는다.** 완료 보고에 "사람이 Vercel env 이름 갱신 필요"를 명시만 할 것.

### 1-8. 배포 설정
- **주의**: 이 프로젝트는 Phase 0에서 사람이 Vercel Framework Preset 을 **Vite 로 수동 고정**해뒀다. 이 수동값이 자동감지를 덮어쓰므로, **Next push 후 사람이 대시보드에서 프리셋을 Next.js 로 직접 바꿔야** 정상 빌드된다(자동 안 됨). Claude Code 는 대시보드를 못 건드리니 **완료 보고에 "사람이 프리셋 Vite→Next 변경 필요"를 명시**할 것.
- `vercel.json`에 Vite식 SPA rewrite를 남기지 말 것(Next 라우팅과 충돌). 특별한 rewrite가 불필요하면 `vercel.json`은 제거하거나 최소 구성만.
- `next.config.ts`는 기본 구성(필요 최소). PWA(next-pwa 등)는 **이번에 넣지 않는다** — 후속 Phase에서 검토(SoT의 PWA 요건은 유지되나 프레임워크 변경으로 구현 방식 재검토 필요).

---

## §2. 금지 사항
- ❌ 나인브릿지 컴포넌트·디자인 토큰·톤(브랜드 컬러/화이트박스/폰트 스케일/master-detail 레이아웃) 이식 — **전부 Phase 2**. 이번엔 빈 껍데기 + Tailwind 동작 확인용 최소 마크업만.
- ❌ 실제 기능(신청폼·달력·OTP·어드민 인증·CMS) 구현.
- ❌ `_DEV/seeds/**` 수정·삭제.
- ❌ 새 레포 생성 / 기존 Supabase 프로젝트·스키마 변경.
- ❌ Vercel 대시보드·env 값 직접 조작(코드/`.env.example`만).
- ❌ service_role·SOLAPI·VAPID 등 비밀키를 브라우저 코드나 `NEXT_PUBLIC_*`에 노출.
- ❌ 이 프롬프트에 없는 판단이 필요하면 임의 진행 말고 **보고 후 대기**(사람이 이 챗에서 결정해 전달).

---

## §3. 착수 전 확정 사항 (모두 결정됨 — 질문 없이 착수)
- **프레임워크**: Next.js App Router (Vite 폐기). TypeScript, npm.
- **스타일**: Tailwind v4(`@theme` 방식). 단 이번엔 브랜드 토큰 없이 기본 셋업만.
- **구성**: 단일 앱(모노레포 아님).
- **레포**: 기존 `reverve9/pea` 갈아엎기(같은 레포·히스토리 유지). 보존 `_DEV/seeds/**`, 제거 Vite 일체.
- **`/api`**: Next Route Handlers 통합. 이번엔 `health` 하나.
- **env**: `NEXT_PUBLIC_*`(브라우저) / 무접두사(서버). Vercel 갱신은 사람 몫(보고에 명시).
- **배포**: Vercel Next 프리셋. Vite식 rewrite 제거.
- **범위**: Phase 0 를 Next 로 재현하는 수준(빈 앱 + `/`·`/admin` 자리표시자 + `/api/health` + Supabase 클라 + env). 그 이상 금지.

---

## §4. 커밋 방식
- 논리 단위로 커밋(예: `chore: remove vite scaffold`, `feat: bootstrap next app router`, `feat: supabase client + health route`, `docs: env.example for next`).
- 커밋 메시지 영어 prefix + 간결 설명. main 브랜치에 push.
- push 후 Vercel 자동배포 확인.

---

## §5. 핸드오프 예상 출력 (완료 보고에 포함)
- 제거한 파일 / 새로 생성한 파일 목록(경로).
- `_DEV/seeds/**` 보존 확인.
- `npm run build` 통과 여부, `npm run dev` 로컬 기동 확인.
- 배포 URL(`pea-ten.vercel.app` 유지 예상) + `/`·`/admin`·`/api/health` 라이브 응답 확인.
- **사람 작업 안내(2가지, 순서 중요)**: Next push 완료 후 사람이 Vercel 대시보드에서 아래를 처리해야 정상 배포된다. 완료 보고에 두 가지 모두 명시할 것.
  1. **Framework Preset 을 Vite → Next.js 로 변경**(Phase 0에서 Vite로 수동 고정돼 있음. 안 바꾸면 Next 코드를 Vite로 빌드하려다 실패). Build Command/Output Directory 수동 override 가 있으면 비워 Next 기본값으로.
  2. **env 이름 갱신(3개, 값은 그대로 이름만)**: `VITE_SUPABASE_URL`→`NEXT_PUBLIC_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`→`NEXT_PUBLIC_SUPABASE_ANON_KEY`, `VITE_SITE_URL`→`NEXT_PUBLIC_SITE_URL`. 안 하면 Supabase 연결 끊김. (`VITE_SITE_URL`이 아직 미등록이면 `NEXT_PUBLIC_SITE_URL=https://pea-ten.vercel.app`로 이번에 신규 등록.)
- Tailwind v4 동작 확인(자리표시자에 클래스 적용됨).
- 미해결/주의 사항.

---

## §6. 다음 블록 예고
- 완료 보고 받으면 이 챗에서 **필요 시 간단 검증**(빌드·3개 엔드포인트·env 갱신 후 Supabase 연결) 안내. 순수 재부트스트랩이라 별도 대형 검증 프롬프트는 생략 가능(로직 없음).
- 그 다음이 **Phase 2(공개 UI 골격 + 달력)** — 이때 비로소 나인브릿지 `apps/web/`의 셸·디자인 토큰·master-detail 컴포넌트를 이식한다. 이식 경계(가져올 것/버릴 것)와 톤앤매너(협회용 눌러쓰기)는 이 챗에서 확정 후 별도 프롬프트로 전달한다.
