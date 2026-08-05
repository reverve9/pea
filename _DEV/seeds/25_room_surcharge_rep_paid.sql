-- 25_room_surcharge_rep_paid.sql — 개별객실 '동반인 대표 납부' 옵션 2종 추가(2026-08-05 오너 지시).
--   기존 7종(room_22_4_1~3 / room_33_5_1~4) 하단에 붙는다 → sort_order 28·29.
--   추가금 0원: 객실 차액을 동반인이 대표에게 직접 납부하므로 신청자 결제액에는 반영하지 않음.
--   category='room_surcharge' 이므로 신청폼 드랍다운·어드민 연수설정(기본가/차수별 오버라이드)·
--   연수안내 요금표·서버 재계산(lib/pricing) 전부 자동 연동(하드코딩 목록 없음).
--
-- 재실행 안전: (category, item_key) UNIQUE 기반 UPSERT.

INSERT INTO price_items (category, item_key, label, amount, is_active, sort_order) VALUES
  ('room_surcharge','room_22_4_rep','22평 4인실 사용, 동반인 대표 납부',0,true,28),
  ('room_surcharge','room_33_5_rep','33평 5인실 사용, 동반인 대표 납부',0,true,29)
ON CONFLICT (category, item_key) DO UPDATE
  SET label = EXCLUDED.label,
      amount = EXCLUDED.amount,
      is_active = EXCLUDED.is_active,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();

-- 검증: SELECT item_key, label, amount, sort_order FROM price_items WHERE category='room_surcharge' ORDER BY sort_order;
