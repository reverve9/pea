'use client'

import React, { useMemo, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { SCHEDULE_TYPE } from '@/lib/display'
import type { PriceItemAdmin, ScheduleType } from '@/lib/types'

// 기본 요금(price_items) 2열 그리드 — 묶음 3그룹(직무연수/자율패키지/렌탈). 요금 모달 하단·기본요금 모달 공용.
// 금액만 편집(노출 여부는 일정 관리 소관). 상태(amounts)·저장은 부모가 소유하고 이 컴포넌트는 표현만.
const PKG_VARIANTS: ScheduleType[] = ['weekend_2n', 'weekday_2n', 'weekend_1n']
const variantOf = (itemKey: string) => itemKey.replace(/^pkg_/, '').replace(/_\d+$/, '')

const isRowDirty = (it: PriceItemAdmin, raw: string | undefined) => {
  if (raw == null || raw.trim() === '') return false
  return Math.trunc(Number(raw)) !== it.amount
}
const isRowInvalid = (raw: string | undefined) => {
  const n = Number(raw)
  return raw == null || raw.trim() === '' || !Number.isFinite(n) || n < 0
}

// 부모 저장용 유틸 — 변경분 수/검증/패치.
export function baseDirtyCount(items: PriceItemAdmin[], amounts: Record<string, string>): number {
  return items.filter((it) => isRowDirty(it, amounts[it.id])).length
}
export function baseHasInvalid(items: PriceItemAdmin[], amounts: Record<string, string>): boolean {
  return items.some((it) => isRowInvalid(amounts[it.id]))
}
export function basePatches(items: PriceItemAdmin[], amounts: Record<string, string>): { id: string; amount: number }[] {
  return items
    .filter((it) => isRowDirty(it, amounts[it.id]))
    .map((it) => ({ id: it.id, amount: Math.trunc(Number(amounts[it.id])) }))
}
export function initBaseAmounts(items: PriceItemAdmin[]): Record<string, string> {
  const m: Record<string, string> = {}
  for (const it of items) m[it.id] = String(it.amount)
  return m
}

export default function BaseGrid({
  items,
  amounts,
  onAmount,
}: {
  items: PriceItemAdmin[]
  amounts: Record<string, string>
  onAmount: (id: string, v: string) => void
}) {
  const jikmuBase = items.filter((it) => it.category === 'jikmu_base')
  const rooms = items.filter((it) => it.category === 'room_surcharge')
  const rentals = items.filter((it) => it.category === 'rental')
  const pkgByVariant = useMemo(() => {
    const m: Record<string, PriceItemAdmin[]> = {}
    for (const it of items.filter((i) => i.category === 'pkg_price')) {
      const v = variantOf(it.item_key)
      ;(m[v] ??= []).push(it)
    }
    return m
  }, [items])

  const row = (it: PriceItemAdmin) => (
    <Row
      key={it.id}
      item={it}
      value={amounts[it.id] ?? ''}
      dirty={isRowDirty(it, amounts[it.id])}
      onAmount={(v) => onAmount(it.id, v)}
    />
  )

  return (
    <div className="space-y-4">
      <Bundle title="직무연수">
        {jikmuBase.length > 0 && <SubGroup label="기본가">{jikmuBase.map(row)}</SubGroup>}
        {rooms.length > 0 && <SubGroup label="객실 추가금">{rooms.map(row)}</SubGroup>}
      </Bundle>
      <Bundle title="자율 패키지">
        {PKG_VARIANTS.map((v) =>
          (pkgByVariant[v]?.length ?? 0) > 0 ? (
            <SubGroup key={v} label={SCHEDULE_TYPE[v].label}>
              {pkgByVariant[v].map(row)}
            </SubGroup>
          ) : null,
        )}
      </Bundle>
      <Bundle title="렌탈·구매 옵션">
        <SubGroup>{rentals.map(row)}</SubGroup>
      </Bundle>
    </div>
  )
}

function Bundle({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <section className="overflow-hidden rounded-[10px] bg-[#f6f8fa]">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between bg-[#eef1f4] px-4 py-2.5 text-left text-[12.5px] font-[600] text-[#1f2937] transition-colors hover:bg-[#e6e9ec]"
      >
        {title}
        <ChevronDown size={15} className={`shrink-0 text-[#9ca3af] transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="divide-y divide-[#f4f5f7]">{children}</div>}
    </section>
  )
}

function SubGroup({ label, children }: { label?: string; children: React.ReactNode }) {
  return (
    <div className="px-4 py-2">
      {label && <div className="mb-1 text-[11px] font-[600] uppercase tracking-wide text-[#9ca3af]">{label}</div>}
      <div className="grid grid-cols-1 gap-x-8 gap-y-0.5 md:grid-cols-2">{children}</div>
    </div>
  )
}

function Row({
  item,
  value,
  dirty,
  onAmount,
}: {
  item: PriceItemAdmin
  value: string
  dirty: boolean
  onAmount: (v: string) => void
}) {
  const invalid = isRowInvalid(value)
  return (
    <div className={`flex items-center gap-2 py-1 ${item.is_active ? '' : 'opacity-55'}`}>
      <div className="min-w-0 flex-1 truncate text-[12.5px] font-[400] text-[#374151]">
        {item.label}
        {!item.is_active && <span className="ml-1.5 text-[11px] font-[300] text-[#9ca3af]">· 숨김</span>}
      </div>
      {dirty && !invalid && <span className="shrink-0 text-[11px] font-[500] text-[#c2751a]">수정됨</span>}
      <div className="relative shrink-0">
        <input
          type="number"
          min={0}
          step={500}
          inputMode="numeric"
          value={value}
          onChange={(e) => onAmount(e.target.value)}
          className={`admin-field w-28 rounded-[7px] py-1.5 pl-2.5 pr-6 text-right text-[12.5px] tabular-nums text-[#1f2937] outline-none focus:bg-[#eef2f6] ${
            invalid ? 'bg-[#fdeceb]' : dirty ? 'bg-[#fdf4e8]' : 'bg-white'
          }`}
        />
        <span className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-[300] text-[#9ca3af]">
          원
        </span>
      </div>
    </div>
  )
}
