# Handoff — 참가자 후속입력 개별링크 전환 · 용어정리 · 더미 UUID 버그

작성 2026-07-06. 브랜치 main. 대상 = 자율패키지 참가자 후속입력(셀프필) 프라이버시 개선 + 용어 정정 + 더미 버그 수정.
관련 메모리 `[[companion-detail-post-signup-fill]]` · `[[companion-vs-participant-terminology]]` · `[[buttons-use-canonical-solid]]`.

---

## 1. 용어: 자율 "동반인" → "참가자"
직무 "동반인"(각자 별도 신청한 사람 중 방배정·강습조 매칭)과 자율 "참가자"(한 건으로 함께 신청한 그룹)는 **다른 개념**. 오너 확정.
- 자율 전용 UI/주석 전부 참가자로 교체: CompanionFill·ParticipantFillSlot·`/fill`·제출 placeholder(`참가자 N`)·안내문·버튼.
- 슬롯 라벨 = 대표 / 참가자 2 / 참가자 3… (`part.sort_order + 1`).
- 직무 JikmuApplyForm "동반인" 9곳 **유지**(맞는 표현).

## 2. 더미 UUID 버그 (코드 아님 — 시드 문제)
- 증상: /my·어드민에서 링크복사·로스터 "잘못된 요청"(400).
- 원인: 더미 application id(`a0000000-0000-0000-0000-…`)가 RFC 유효 UUID 아님(버전·변형 비트 0) → **zod4 `.uuid()` 거부**. 실제 신청은 `gen_random_uuid()`라 무관.
- 수정: 시드 id를 유효 v4(`…-4000-8000-…`)로 치환. **⚠ 시드 `_DEV/seeds/12_dummy_applications_v2.sql` 재실행 필요**(맨 위 DELETE로 교체).

## 3. 셀프필 링크: 통합 → **참가자별 개별 링크** (프라이버시)
문제: 통합 링크(신청 단위 토큰)는 받은 누구나 전체 로스터 조회 + 아무 슬롯 수정 가능.
해결: 토큰 = `FillToken {aid, pid, iat}` (참가자 단위).
- `/api/fill/roster`: `getRosterParticipant(aid,pid)` → **본인 1명만** 반환(타인 정보 미노출).
- `/api/fill`(저장): `body.pid ≠ claims.pid` → **403**. 남의 슬롯 조작 차단.
- 발급: `issueFillToken(aid,pid)` / `requestMyFillLink(token,aid,pid)` / `issueFillLink(aid,pid)`.
- 대표 /my: 각 참가자 슬롯 **우측 끝 "링크복사"** (비대표만, `ParticipantFillSlot`에 `onCopyLink`/`copyState` prop 추가).
- 어드민 상세: 참가자 행별 "링크" 버튼(자율 비대표).
- 뒷자리 정책(오너 결정): **대표/어드민 대신입력에서 뒷자리 입력 유지** + 각자 본인 개별링크로도 입력. 항상 write-only.
- 신규: `lib/participantRoster.getRosterParticipant`, `MyRosterParticipant.sort_order`.

## 4. 어드민 보험 뒷자리 = 항상 표시
"보험 뒷자리 표시" 버튼 제거 → 모달 열릴 때 `revealInsuranceRoster` **자동 복호**(useEffect). 어드민은 늘 표시.

## 5. 마이 버튼 정본화(앞 커밋 후속) — 이번 세션 포함분
`/my` 액션 버튼 전부 정본 `components/common/Button`(솔리드 primary). 모바일 상단여백 pd `pt-10`. (이미 커밋 30ebce4 아님 — 이번 미커밋 묶음)

---

## 상태
- tsc 클린. **로컬 dev 확인 일부만**(버튼·여백 육안). 개별링크 E2E(시크릿창 본인만 수정)·복호는 **QA 미완**.
- 파일 14개 이번 커밋 예정.

## 다음 세션 (큰 덩어리 — 착수 대기)
- 체크리스트(`_DEV/handoff/체크리스트.md`) A~E 라이브 QA: 시드 재실행 후 개별링크·참가자 슬롯·복호·write-only 검증.
- (오너 언급) 다음 작업은 규모 큼 — 별도 착수.
