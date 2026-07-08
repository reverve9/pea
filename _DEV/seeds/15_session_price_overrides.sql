-- 15_session_price_overrides.sql — 차수별 요금 인라인 오버라이드.
-- 모델(오너 확정 2026-07-08): 세트/티어 오브젝트 없이 '기본값(price_items) + 차수마다 변경된 항목만' 얹는다.
--   차수가 어떤 item_key 에 다른 금액을 지정하면 그 값이 우선, 없으면 기본가(price_items.amount) 상속(sparse).
--   가격 해석은 폼(클라)·제출(서버) 모두 '기본가 ▸ 차수 오버라이드 머지'. 스냅샷(price_breakdown)은 제출 시 확정되어 소급 없음.
-- 실행: Supabase SQL editor 1회. 멱등(IF NOT EXISTS / DROP POLICY).

CREATE TABLE IF NOT EXISTS session_price_overrides (
  session_id uuid NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  item_key   text NOT NULL,               -- price_items.item_key (전역 유니크) 참조. 값만 덮어씀.
  amount     int  NOT NULL CHECK (amount >= 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, item_key)
);

-- updated_at 자동 갱신(기존 공용 트리거 함수 재사용).
DROP TRIGGER IF EXISTS set_updated_at ON session_price_overrides;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON session_price_overrides
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RLS: 금액뿐이라 PII 없음 → anon 조회 허용(폼 실시간 합계용). 쓰기는 service_role(어드민)만(RLS 우회).
ALTER TABLE session_price_overrides ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS session_price_overrides_select ON session_price_overrides;
CREATE POLICY session_price_overrides_select ON session_price_overrides FOR SELECT TO anon USING (true);
