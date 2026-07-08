# Handoff — Phase 3: 후속 미결 처리 · 환불 경로 통일 · 되돌리기 레이어 · 어드민 UI

작성 2026-07-09. 근거·최종결정 = 메모리 `requests-reorg-modification-restructure`(하단 "후속 미결 4건"·"환불 경로 전면 통일" 절). 정산 = `settlement-spec`.

## ⚠️ 배포 전 필수 (seed 실행 순서)
- **`_DEV/seeds/19_due_claim.sql`** — applications +due_claimed_at +due_settled_amount
- **`_DEV/seeds/20_refund_admin_origin.sql`** — refund_requests origin CHECK 에 'admin' 추가
- 안 돌리면 마이/어드민 쿼리 select·registerAdminRefund insert 가 실패.

## 1) 후속 미결 4건 (오너 선택 반영)
- **①부분환불 계좌** = 어드민 처리 중 입력. `confirmRefundFromRequest`에 refundAccount 인자, RefundInline 은 계좌 없을 때만 입력칸.
- **②추가입금 신고** = 마이 due 배너 '추가입금 완료 알림' 버튼 → API `due_payment` → `due_claimed_at`(1회). 어드민 due 배너 '고객 입금완료 신고' 칩. 최초 입금(payment_claimed_at)과 별개 필드.
- **③통지 도달** = 마이 API가 신청별 modification/refund 요청 조인 → 마이 상세 '요청 처리 현황' 섹션(상태·admin_reply·금액, 내부메모 미노출). 외부발송(SMS/알림톡)은 후속.
- **④is_secret** = 현행 유지(OTP 경유 무의미·무해).

## 2) 되돌리기 레이어 (오너: 재오픈 + 금액 복원)
처리완료 요청도 상세 '처리된 요청'에 노출 + 되돌리기. 모든 종료성 액션 회귀 대칭:
| 액션 | 회귀 | 위치 |
|---|---|---|
| 입금확인(paid) | 입금대기 스테퍼 | 상태변경 |
| 추가입금 확인 | '추가입금 대기로 되돌리기' 버튼 | 추가입금 확인됨 박스 |
| 신청취소 | 같은 버튼이 '재신청'으로 토글 | 예외처리 |
| 환불(관리자/요청) | '되돌리기' | 처리된 요청 |
| 수정 반영 | '되돌리기' | 처리된 요청 |
- `revertModification`: 참가자 필드 current 스냅샷 역복원 + total−=delta + 감액 자동환불요청 회수 + pending 재오픈. ⚠연동 환불이 이미 완료면 차단(먼저 환불 되돌려야).
- `revertRefund`: refunded_amount=0 + 전액이면 status paid 복원 + 요청 requested 재오픈.
- `revertDuePayment`: 보존한 due_settled_amount → due_amount 복원.
- `revertCancel`: deposit_confirmed_at 있으면 paid, 없으면 pending 복원(기준일 재스탬프 안 함).
- ⚠refunded_amount 는 신청당 단일값(SET) — 한 신청 다중환불은 마지막 것만 정확 복구.

## 3) 환불 경로 전면 통일 (오너: 모달 위 모달 싫음)
- **직접 환불 모달(RefundModal)·setApplicationRefund·revertApplicationRefund 폐지.** '환불완료…' 버튼 제거.
- **관리자 직접 환불 = 인라인**(AdminRefundInline): 예외처리 '환불 등록' 토글 → `registerAdminRefund`가 refund_request(origin='admin', 완료) 생성 + refunded_amount 반영. 폐강·비대면·중복입금·재량 전부 이 경로.
- **전액/반액 단축**(RefundQuick 공용): 환불 확정·관리자 등록 금액칸.
- 되돌리기 통일: '처리된 요청' revertRefund(admin origin 도 completed→여기 뜸).
- ⚠**후속 TODO: 연수관리 차수 '일괄환불'**(폐강 전원환불, 연수완료 일괄처럼). 정산 영향 커서 이번 미구현.

## 4) 어드민 UI 가독성 / 라벨
- **사이드바 네이비**(bg #152a46 = 테마 네이비 #1e3a5f 딥 변형, 어드민 가독성용 + 밝은 텍스트). AdminSidebar.tsx.
- **리스트 페이지당 20→15** — AdminList 기본 pageSize + 정산 PAGE.
- **취소 라벨 정리**: 어드민 버튼 신청취소↔재신청(토글), 배지 '취소'→'신청취소'(APPLICATION_STATUS), 마이 배지도 '신청취소'.

## 5) 신청 리스트 정렬 정책 (오너 확정)
- **신청순(created_at desc)만.** 입금확인 대기 우선 2차 재정렬 폐기(요동침 방지). needs_review 필드는 유지.
- **입금확인요청 대기건 = 배너 클릭 필터**(reviewOnly): 'N건' 배너 클릭 → needs_review만 소집, 0건 되면 자동 해제(빈목록 방지).
- 노란 행 하이라이트 제거 — '입금확인요청' 컬럼 '확인요청' 배지로 이미 식별 + 배너 소집. = 안정 순서 + 온디맨드 큐(제3안).

## 검증 / 배포
tsc·eslint 클린. dev=live Supabase. seed 19·20 실행 후 확인 → 커밋·푸시 완료.

## 다음 세션
**현금영수증(cash receipt) UI** 작업 예정.
