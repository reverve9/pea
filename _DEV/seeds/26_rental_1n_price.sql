-- 26_rental_1n_price.sql — 렌탈 요금 1박/2박 분기(2026-08-05 오너 지시).
-- 배경: 연수안내 '추가렌탈(선택사항)'을 2박·1박 2행으로 나눴으므로 실제 과금도 박수에 따라 갈려야 한다.
--   기존 apparel/goggle/protector/glove = 2박 요금(그대로 유지) + 1박 요금 3종 신규(_1n 접미).
--   장갑은 '구매'라 박수와 무관(요금표도 양쪽 15,000원 동일) → _1n 항목을 두지 않고 기본가로 폴백한다.
--     나중에 1박 장갑가를 따로 받고 싶으면 여기에 glove_1n 을 추가하면 코드 수정 없이 즉시 적용된다.
--
-- 적용 대상: 자율패키지 주말1박(weekend_1n)만. 직무연수·자율 2박 변형은 기존 요금 유지.
--   서버 재계산(lib/pricing.computeJayul)·신청폼 실시간 합계가 같은 폴백 규칙을 공유한다.
--
-- 재실행 안전: (category, item_key) UNIQUE 기반 UPSERT.

INSERT INTO price_items (category, item_key, label, amount, is_active, sort_order) VALUES
  ('rental','apparel_1n','의류 대여(스키복 상하의) · 1박',20000,true,15),
  ('rental','goggle_1n','고글 대여 · 1박',10000,true,16),
  ('rental','protector_1n','보호대 대여 · 1박',10000,true,17)
ON CONFLICT (category, item_key) DO UPDATE
  SET label = EXCLUDED.label,
      amount = EXCLUDED.amount,
      is_active = EXCLUDED.is_active,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();

-- 검증: SELECT item_key, label, amount, sort_order FROM price_items WHERE category='rental' ORDER BY sort_order;
