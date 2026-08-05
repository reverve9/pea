'use client'

import React from 'react'
import WhiteBox from '@/components/common/WhiteBox'
import { EmptyState } from '@/components/common/StateView'
import { formatKRW } from '@/lib/display'
import type { PriceItem, PriceCategory } from '@/lib/types'

// §3-2 비용표: price_items 를 category별(그리고 패키지는 일정유형별)로 그룹핑해 읽기 전용 표로.
// 계산·선택 없음. 스타일은 white-box 토큰 + fluid-* 만.

// 한 그룹(제목 + 행들)을 표로
function PriceGroup({ title, items }: { title: string; items: PriceItem[] }) {
  if (items.length === 0) return null
  return (
    <div>
      <h4 className="fluid-body font-[600] text-[#1e3a5f] mb-2 px-1">{title}</h4>
      <WhiteBox className="p-0 overflow-hidden">
        <table className="w-full">
          <tbody>
            {items.map((it, i) => (
              <tr key={it.id} className={i > 0 ? 'border-t border-[#f0f1f3]' : ''}>
                <td className="fluid-body text-[#4b5563] px-4 py-2.5">{it.label}</td>
                <td className="fluid-body font-[600] text-[#1e3a5f] px-4 py-2.5 text-right whitespace-nowrap tabular-nums">
                  {formatKRW(it.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </WhiteBox>
    </div>
  )
}

// 패키지 일정유형 분류 (item_key prefix 기준)
function pkgBucket(key: string): string {
  if (key.startsWith('pkg_weekday_2n')) return '주중 2박'
  if (key.startsWith('pkg_weekend_2n')) return '주말 2박'
  if (key.startsWith('pkg_weekend_1n')) return '주말 1박'
  return '기타'
}

const CATEGORY_TITLE: Record<PriceCategory, string> = {
  jikmu_base: '직무연수 기본가',
  pkg_price: '자율패키지 요금',
  room_surcharge: '개별객실 추가요금 (2박 기준)',
  rental: '대여 · 구매 옵션',
}

export default function PriceTable({ items }: { items: PriceItem[] }) {
  if (items.length === 0) {
    return <EmptyState label="비용 정보가 곧 등록됩니다." />
  }

  const byCategory = (cat: PriceCategory) =>
    items.filter((i) => i.category === cat).sort((a, b) => a.sort_order - b.sort_order)

  const pkg = byCategory('pkg_price')
  const pkgBuckets = ['주말 2박', '주중 2박', '주말 1박'].map((bucket) => ({
    bucket,
    rows: pkg.filter((i) => pkgBucket(i.item_key) === bucket),
  }))

  return (
    <div className="space-y-6">
      <PriceGroup title={CATEGORY_TITLE.jikmu_base} items={byCategory('jikmu_base')} />

      {pkg.length > 0 && (
        <div className="space-y-4">
          <h4 className="fluid-body font-[600] text-[#1e3a5f] px-1">{CATEGORY_TITLE.pkg_price}</h4>
          <div className="space-y-4 pl-1">
            {pkgBuckets.map(
              ({ bucket, rows }) => rows.length > 0 && <PriceGroup key={bucket} title={bucket} items={rows} />,
            )}
          </div>
        </div>
      )}

      <PriceGroup title={CATEGORY_TITLE.room_surcharge} items={byCategory('room_surcharge')} />
      <PriceGroup title={CATEGORY_TITLE.rental} items={byCategory('rental')} />
    </div>
  )
}
