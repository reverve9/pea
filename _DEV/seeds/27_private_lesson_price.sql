-- 27_private_lesson_price.sql — 자율패키지 '추가(개별) 강습' 단가(2026-08-05 오너 지시: 1회당 180,000원).
-- 그룹 체험 강습 1회는 패키지 기본 포함(무과금)이고, 이 항목은 그 외 개별 강습을 추가로 살 때만 계상된다.
--   수량 0~5(PRIVATE_LESSON_MAX) × 단가. 선택한 시간대는 금액과 무관하며 price_breakdown.meta.private_lesson 에 보존.
--   시간대 목록은 박수에 따라 다름(1박=2슬롯 / 2박=5슬롯, lib/lessonOptions.lessonSlotsFor).
--
-- category 는 price_items CHECK 제약(jikmu_base/room_surcharge/pkg_price/rental) 때문에 'rental' 을 쓴다.
--   → 어드민 연수설정에서 '대여 · 구매 옵션' 그룹에 함께 노출된다(금액 편집·차수별 오버라이드 가능).
--   이 행이 없으면 신청폼의 '추가 강습' 필드 자체가 렌더되지 않는다(가격 없는 옵션 노출 방지).
--
-- 재실행 안전: (category, item_key) UNIQUE 기반 UPSERT.

INSERT INTO price_items (category, item_key, label, amount, is_active, sort_order) VALUES
  ('rental','lesson_private','개별 강습',180000,true,20)
ON CONFLICT (category, item_key) DO UPDATE
  SET label = EXCLUDED.label,
      amount = EXCLUDED.amount,
      is_active = EXCLUDED.is_active,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();

-- 검증: SELECT item_key, label, amount FROM price_items WHERE item_key='lesson_private';
