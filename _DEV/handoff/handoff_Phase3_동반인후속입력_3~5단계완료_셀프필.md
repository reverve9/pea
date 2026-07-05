# handoff — 동반인 후속입력 3~5단계 완료(셀프필 링크 포함). 다음 세션 = 라이브 확인 + 디테일 수정

작성 2026-07-06. 브랜치 main. **이번 세션 커밋·푸시 완료.** 모든 변경 `npx tsc --noEmit` 클린(next build 금지).

> **다음 세션 시작**: 이 핸드오프 + 메모리 `[[companion-detail-post-signup-fill]]`·`[[jayul-apply-form-spec]]`·`[[design-taste-crisp-minimal]]`·`[[submit-pipeline-ops]]` 먼저 읽기.
> **라이브 확인 = `_DEV/handoff/체크리스트.md`** 순서대로.

---

## 0. ⚠ Supabase 실행 상태 (다음 세션 확인 필수)
- `11_application_no_v2.sql`(발번) — 오너 실행 완료.
- `09_certificate_participant.sql` / `10_dummy_applications.sql` — **실행 여부 미확인**. 자율 더미가 있어야 셀프필/로스터 테스트 편함. 미실행이면 자율 1건 직접 제출로 대체 가능.
- **env 필수**: `MY_SESSION_SECRET`(마이·fill 토큰 서명), `APP_ENC_KEY`(뒷자리 암호화). 미설정 시 토큰발급/뒷자리저장에서 throw.

## 1. 이번 세션 완료 (동반인 후속입력 3·4·5단계, [[companion-detail-post-signup-fill]])

### 3단계 — participantDetail 확장 + 어드민 수기 모달
- `lib/participantDetail.ts` `ParticipantDetailInput`에 **name·phone·lessonClass(→lesson_level)·equipment·apparelSize** 추가. rentals(jsonb)는 **현재값 fetch 후 spread merge**(insurance_wanted 등 보존 — 덮어쓰기 금지).
- 어드민 액션 `updateParticipantDetail`을 **객체 인자**(ParticipantDetailInput)로 전환. 수기 모달(`ApplicationsClient.tsx`)은 `kind==='jayul'`일 때만 확장필드(성함·연락처·기초강습·장비·의류사이즈) 노출, 직무는 생년월일·성별·뒷자리 3필드만.
- 참가자표 `rentalLabel`이 자율 `rentals.equipment`(+의류사이즈)도 표기.

### 4단계 — 마이페이지 대표 대신입력 + 셀프필 링크 복사
- `app/my/page.tsx` 자율 신청상세 하단 **CompanionFill** — 로스터 슬롯별 대표 대신입력. `app.kind==='jayul'`만 노출(직무는 단독).
- 신규 `/api/my/roster`(로스터 조회, 뒷자리 미포함) · `/api/my/participant`(**토큰→신청소유권(phone+name)→참가자 소속** 3중검증 후 participantDetail) · `/api/my/fill-link`(마이 세션→fill 토큰 발급).
- "동반인 입력 링크 복사" 버튼 = `origin/fill/{fillToken}` 클립보드 복사.

### 5단계 — 셀프필 공개페이지 + 토큰
- `app/fill/[token]/page.tsx` — **마이 세션 불필요**(링크 토큰이 크리덴셜), 독립 레이아웃(AppShell 미사용). 동반인이 각자 본인 정보 입력. 뒷자리 write-only.
- 신규 `/api/fill/roster`(토큰→로스터+요약) · `/api/fill`(토큰→참가자 소속 검증→participantDetail).
- `lib/serverCrypto.ts` **`issueFillToken`/`verifyFillToken`** — HMAC, 서명 **`'fill:'` 도메인 분리**로 마이 세션토큰과 교차 사용 차단, `MY_SESSION_SECRET` 재사용, TTL 120일, payload=`{aid,iat}`(PII·뒷자리 없음).
- 어드민 상세에도 `issueFillLink` 액션 + "셀프필 링크 복사" 버튼(자율만, 보험 뒷자리표시 버튼 옆).

### 공용화(중복 제거)
- 슬롯 UI = `components/features/ParticipantFillSlot.tsx` (마이·셀프필 공유). `onSave(input)=네트워크호출` + `onSaved()=부모 새로고침` 콜백형.
- 로스터 조회 = `lib/participantRoster.ts` `getRoster`/`getRosterSummary` (마이·셀프필 공유). `/api/my/roster`도 이걸 사용하도록 리팩터.
- `RosterSummary`·`MyRosterParticipant`·`MyParticipantInput` 타입은 `lib/applicationTypes.ts`(클라 안전).

## 2. 다음 세션 = 라이브 확인 + 디테일 수정 (오너 예정)
- `_DEV/handoff/체크리스트.md` 순서대로 A~E 확인.
- 발견 이슈는 체크리스트 하단 "발견 이슈 기록"에 적어두고 다음 세션에서 반영.
- 예상 디테일 후보: 셀프필 페이지 톤/문구, 마이 링크복사 버튼 위치·라벨, 어드민 모달 필드 순서, 슬롯 요약 표기.

## 3. 남은 후속(우선순위 낮음, 미착수)
- 셀프필 슬롯 "본인 것만" 선택 강제(현재는 링크 소유자가 아무 슬롯이나 편집 가능 — 같은 그룹 전제로 허용).
- 증명서 발급(`/admin/certificates`)은 seed 09 실행 + 참가자 신원 채워진 후 실동작 검증.
- 보호대/고글/장갑 per-person 배정(금액영향 없는 optional) — 현재 대표 신청 시 수량만.

## 4. 불변 제약
표시텍스트=Text variant / 버튼=BTN / 입력 16px / 날짜=슬래시 / **선택·필터·포커스=틴트, 테두리금지([[design-taste-crisp-minimal]])** / 셸 3패턴 / `MasterDetail.tsx` 수정금지 / 검증=`npx tsc --noEmit` / UI변경=로컬확인→승인후 push / **뒷자리 평문저장·조회노출 금지(write-only)** / 볼륨 밖 접근금지.

## 5. 핵심 파일 (이번 세션)
- lib: `participantDetail.ts` · `participantRoster.ts`(신규) · `serverCrypto.ts`(fill 토큰) · `applyClient.ts` · `applicationTypes.ts`
- 컴포넌트: `components/features/ParticipantFillSlot.tsx`(신규)
- 마이: `app/my/page.tsx` · `app/api/my/{roster,participant,fill-link}/route.ts`(신규)
- 셀프필: `app/fill/[token]/page.tsx`(신규) · `app/api/fill/{route,roster/route}.ts`(신규)
- 어드민: `app/admin/(panel)/applications/{ApplicationsClient.tsx,actions.ts}`
