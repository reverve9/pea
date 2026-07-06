# Handoff — 신청폼 컴포넌트화 (직무·자율 공용 추출)

작성 2026-07-06. 브랜치 main. 커밋 `f0151a4`. 오너 승인 방향 = **완전 통합(mode 플래그) 아님**, 공용 빌딩블록만 추출.
관련 메모리 `[[jikmu-form-is-componentization-source]]` · `[[match-canonical-not-hardcode]]` · `[[design-taste-crisp-minimal]]`.

## 이번 세션 완료
`components/features/apply/shared.tsx` 신규 — accent(브랜드색) prop로 직무(NAVY `#1e3a5f`)·자율(GREEN `#2f803a`) 분기:
- 상수: `won`·`inputCls`·`selectCls`·`REGIONS`·`ROUTE_OPTIONS`
- 프리미티브: `Field`·`CheckRow`(accent)·`ConsentRow`(accent, `style.accentColor`)
- 조립: `RouteSelect`·`PrivacyConsentBox`(고지문 정적)·`ConsentChecks`(동의 3종)·`PayerConfirm`(입금자, `selfLabel`)
- 두 폼에서 위 로컬 정의 + **개인정보 고지문(복붙 법적 텍스트)** 제거 → 공용 조립. tsc·eslint 클린. (직무 690→573, 자율 680→538)

## 다음 세션 (남은 추출 — 우선순위 순)
1. **ApplicantFields** — 성함·성별·연락처·생년월일·소속+지역(REGIONS). 두 폼 거의 동일하나 성별 선택이 **OptionRow**(각 폼 로컬, compact 동작 상이)를 쓰므로, OptionRow를 prop 받게 넘기거나 ApplicantFields를 각 폼 OptionRow 주입형으로 설계. wording차: 성함 placeholder(직무=참가자 성함 / 자율=대표 신청자 성함), 연락처 hint.
2. **SummaryActions**(합계 박스) — lines·총금액·PayerConfirm·submitError·임시저장/신청 버튼. 거의 동일. lines 계산은 각 폼(도메인), 렌더만 공용화 가능.
3. **useApplyDraft 훅** — localStorage 드래프트 save/load(키만 다름). 두 폼 `useEffect` 복원 + saveDraft 동일 패턴.
4. **OptionRow 통합 검토** — 직무=radio 항상표시+`top` / 자율=compact 시 radio 숨김+`justify-center`. 통합하려면 `compactHidesRadio`·`top` prop 추가. 시각 회귀 위험 있으니 신중(각 폼 유지도 OK).

## 유지·주의
- **도메인 섹션은 각 폼 인라인 유지**: 직무=종목/반·객실·보험·동반·렌탈 on/off(ToggleRow) / 자율=유형/차수/인원·기초강습·대여장비·렌탈 수량(QtyRow). 억지 통합 금지.
- 시각 회귀는 tsc가 못 잡음 → 추출 후 **오너 육안 확인 필요**(모바일 모달/데스크탑 우페인 둘 다).
- 정본 스타일 하드코딩 금지, 공용 조각/토큰 먼저 재사용.
