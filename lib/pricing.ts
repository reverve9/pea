// 가격 재계산 — 순수 함수(서버 권위 계산). 폼의 실시간 합계와 동일 로직이지만
// 저장되는 total_amount·price_breakdown 은 반드시 이 모듈이 price_items 원본으로 산출한다.
// (클라가 보낸 금액 불신뢰 — 조작 방지.)
import type { PriceItem } from './types'
import type { JikmuPayload, JayulPayload } from './applicationTypes'

export interface PriceLine {
  key: string
  label: string
  amount: number
}
export interface PriceBreakdown {
  kind: 'jikmu' | 'jayul'
  lines: PriceLine[]
  total: number
  meta?: Record<string, unknown>
}

const JIKMU_BASE_FALLBACK = 303000
const JIKMU_RENTAL_KEYS = ['apparel', 'protector', 'goggle', 'glove'] as const
const JAYUL_RENTAL_KEYS = ['apparel', 'goggle', 'protector', 'glove'] as const

function indexByKey(items: PriceItem[]): Record<string, PriceItem> {
  const m: Record<string, PriceItem> = {}
  for (const p of items) m[p.item_key] = p
  return m
}

// 직무: 기본가 + (개별객실 추가금) + 렌탈(항목별 1개 정액).
export function computeJikmu(p: JikmuPayload, items: PriceItem[]): PriceBreakdown {
  const by = indexByKey(items)
  const lines: PriceLine[] = []
  const base = by['jikmu_base']?.amount ?? JIKMU_BASE_FALLBACK
  lines.push({ key: 'jikmu_base', label: by['jikmu_base']?.label ?? '기본 연수비', amount: base })

  if (p.roomType === 'private' && p.roomSpec && by[p.roomSpec]) {
    const r = by[p.roomSpec]
    lines.push({ key: r.item_key, label: `개별객실 · ${r.label}`, amount: r.amount })
  }
  for (const key of JIKMU_RENTAL_KEYS) {
    if (p.rentals[key] && by[key]) lines.push({ key, label: by[key].label, amount: by[key].amount })
  }
  const total = lines.reduce((s, l) => s + l.amount, 0)
  return { kind: 'jikmu', lines, total }
}

// 자율: pkg 묶음가(pkg_{변형}_{인원}) + 렌탈(수량×정액).
export function computeJayul(p: JayulPayload, items: PriceItem[]): PriceBreakdown {
  const by = indexByKey(items)
  const lines: PriceLine[] = []
  const pkgKey = p.variant ? `pkg_${p.variant}_${p.headcount}` : ''
  const pkg = pkgKey ? by[pkgKey] : undefined
  lines.push({ key: pkgKey, label: pkg?.label ?? `${p.headcount}인 패키지`, amount: pkg?.amount ?? 0 })

  for (const key of JAYUL_RENTAL_KEYS) {
    const qty = p.rentals[key] ?? 0
    if (qty > 0 && by[key]) lines.push({ key: `${key}_x${qty}`, label: `${by[key].label} ×${qty}`, amount: by[key].amount * qty })
  }
  const total = lines.reduce((s, l) => s + l.amount, 0)
  // 구매 수량을 meta 에 보존 — 신청 후 마이페이지 대표 배정 단계의 정합성 대조(배정 합계 = 구매 수량) 원천.
  const rental_qty = {
    apparel: p.rentals.apparel ?? 0,
    goggle: p.rentals.goggle ?? 0,
    protector: p.rentals.protector ?? 0,
    glove: p.rentals.glove ?? 0,
  }
  return { kind: 'jayul', lines, total, meta: { rental_qty } }
}
