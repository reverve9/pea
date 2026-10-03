-- ============================================================
-- 37_refunded_amount_check.sql — 기존 환불액 점검·보정 (36 다음)
--
-- 배경: 예전에는 환불을 확정할 때마다 신청의 환불액을 그 금액으로 덮어썼고, 고객 환불요청은 지급액을 기록하지 않았다.
--       새 코드는 환불액 = 완료된 환불 기록 지급액(paid_amount, 없으면 amount) 합계로 계산한다.
-- 순서: ① 점검(읽기) → ② 완료 환불이 1건인 신청만 지급액 채움(그 경우 예전 환불액 = 그 건 지급액이라 정확)
--       → ③ 지급액이 모두 확인되는 신청만 환불액 재계산 → ④ 남는 건(완료 환불 2건 이상 + 금액 미상)은 수동 확인.
-- 멱등. 금액을 추정해서 채우지 않는다.
-- ============================================================

-- ① 점검: 환불액과 완료 환불 기록 합계가 다른 신청
SELECT a.application_no, a.refunded_amount,
       COALESCE(SUM(COALESCE(r.paid_amount, r.amount)) FILTER (WHERE r.status = 'completed'), 0) AS completed_sum,
       COUNT(*) FILTER (WHERE r.status = 'completed') AS completed_cnt,
       COUNT(*) FILTER (WHERE r.status = 'completed' AND r.paid_amount IS NULL AND r.amount IS NULL) AS unknown_cnt
  FROM applications a
  LEFT JOIN refund_requests r ON r.application_id = a.id
 GROUP BY a.id
HAVING a.refunded_amount <> COALESCE(SUM(COALESCE(r.paid_amount, r.amount)) FILTER (WHERE r.status = 'completed'), 0)
 ORDER BY a.application_no;

-- ② 완료 환불이 1건뿐인 신청: 그 건 지급액 = 예전 환불액
UPDATE refund_requests r
   SET paid_amount = a.refunded_amount
  FROM applications a
 WHERE r.application_id = a.id
   AND r.status = 'completed'
   AND r.paid_amount IS NULL
   AND (SELECT COUNT(*) FROM refund_requests x WHERE x.application_id = a.id AND x.status = 'completed') = 1;

-- ③ 완료 환불 지급액이 모두 확인되는 신청만 환불액 = 합계
UPDATE applications a
   SET refunded_amount = s.total
  FROM (
    SELECT application_id, SUM(COALESCE(paid_amount, amount)) AS total
      FROM refund_requests
     WHERE status = 'completed' AND application_id IS NOT NULL
     GROUP BY application_id
    HAVING COUNT(*) FILTER (WHERE paid_amount IS NULL AND amount IS NULL) = 0
  ) s
 WHERE a.id = s.application_id AND a.refunded_amount <> s.total;

-- ④ ① 을 다시 실행해 남는 건은 환불 기록을 보고 paid_amount 를 직접 채운 뒤 ③ 을 다시 실행한다.
