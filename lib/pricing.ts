// 가격 재계산 — 순수 함수(서버 권위 계산). 폼의 실시간 합계와 동일 로직이지만
// 저장되는 total_amount·price_breakdown 은 반드시 이 모듈이 price_items 원본으로 산출한다.
// (클라가 보낸 금액 불신뢰 — 조작 방지.)
import type { PriceItem } from './types'
import type { JikmuPayload, JayulPayload, RentalQty } from './applicationTypes'

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

// 렌탈 요금은 박수에 따라 다르다 — 1박은 '{키}_1n' 항목을 쓰고, 없으면 기본(2박) 요금으로 폴백.
// 폴백 덕분에 장갑(구매라 박수 무관, _1n 없음)이 그대로 동작하고, 나중에 glove_1n 을 추가하면 코드 수정 없이 반영된다.
// 직무연수는 항상 2박 3일이라 분기 대상이 아니다(기본 키 그대로).
export const ONE_NIGHT_VARIANT = 'weekend_1n'
// 개별(추가) 강습 단가 항목 — price_items(category='rental')에서 어드민이 금액 편집.
export const PRIVATE_LESSON_KEY = 'lesson_private'
export function rentalPriceItem(
  by: Record<string, PriceItem>,
  key: string,
  oneNight: boolean,
): PriceItem | undefined {
  return (oneNight ? by[`${key}_1n`] : undefined) ?? by[key]
}

// price_breakdown.meta.rental_qty 추출(자율). 없거나 직무면 전부 0.
export function extractRentalQty(breakdown: { meta?: Record<string, unknown> } | null | undefined): RentalQty {
  const q = (breakdown?.meta?.rental_qty ?? {}) as Partial<Record<keyof RentalQty, unknown>>
  return {
    apparel: Number(q.apparel) || 0,
    goggle: Number(q.goggle) || 0,
    protector: Number(q.protector) || 0,
    glove: Number(q.glove) || 0,
  }
}

// price_breakdown.meta.private_lesson 추출(자율 추가강습). 없으면 0회·빈 목록.
export function extractPrivateLesson(
  breakdown: { meta?: Record<string, unknown> } | null | undefined,
): { qty: number; slots: string[] } {
  const pl = (breakdown?.meta?.private_lesson ?? {}) as { qty?: unknown; slots?: unknown }
  return {
    qty: Number(pl.qty) || 0,
    slots: Array.isArray(pl.slots) ? pl.slots.filter((s): s is string => typeof s === 'string') : [],
  }
}

function indexByKey(items: PriceItem[]): Record<string, PriceItem> {
  const m: Record<string, PriceItem> = {}
  for (const p of items) m[p.item_key] = p
  return m
}

// 기본가(price_items) 위에 차수 오버라이드를 얹어 '유효가'를 만든다(sparse — 있는 항목만 금액 교체).
// 폼(클라 실시간 합계)·제출(서버 권위 계산)이 같은 결과를 내도록 공용으로 쓴다.
export function applyOverrides(
  items: PriceItem[],
  overrides: { item_key: string; amount: number }[],
): PriceItem[] {
  if (!overrides.length) return items
  const by: Record<string, number> = {}
  for (const o of overrides) by[o.item_key] = o.amount
  return items.map((it) => (it.item_key in by ? { ...it, amount: by[it.item_key] } : it))
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

  // 주말1박은 1박 렌탈 요금 적용. 라벨은 기본 항목 것을 써서 합계 줄이 '… · 1박 ×2'로 길어지지 않게 한다.
  const oneNight = p.variant === ONE_NIGHT_VARIANT
  for (const key of JAYUL_RENTAL_KEYS) {
    const qty = p.rentals[key] ?? 0
    const priced = rentalPriceItem(by, key, oneNight)
    if (qty > 0 && priced) {
      lines.push({ key: `${key}_x${qty}`, label: `${(by[key] ?? priced).label} ×${qty}`, amount: priced.amount * qty })
    }
  }
  // 개별(추가) 강습 — 수량×단가. 기본 포함인 그룹 체험 강습은 과금 대상이 아니다.
  const lessonQty = p.privateLesson?.qty ?? 0
  const lessonItem = by[PRIVATE_LESSON_KEY]
  if (lessonQty > 0 && lessonItem) {
    lines.push({
      key: `${PRIVATE_LESSON_KEY}_x${lessonQty}`,
      label: `${lessonItem.label} ×${lessonQty}`,
      amount: lessonItem.amount * lessonQty,
    })
  }

  const total = lines.reduce((s, l) => s + l.amount, 0)
  // 구매 수량을 meta 에 보존 — 신청 후 마이페이지 대표 배정 단계의 정합성 대조(배정 합계 = 구매 수량) 원천.
  const rental_qty = {
    apparel: p.rentals.apparel ?? 0,
    goggle: p.rentals.goggle ?? 0,
    protector: p.rentals.protector ?? 0,
    glove: p.rentals.glove ?? 0,
  }
  // 선택한 시간대는 금액과 무관하지만 운영(조 편성)에 필요 → meta 에 보존.
  const private_lesson = { qty: lessonQty, slots: p.privateLesson?.slots ?? [] }
  return { kind: 'jayul', lines, total, meta: { rental_qty, private_lesson } }
}
