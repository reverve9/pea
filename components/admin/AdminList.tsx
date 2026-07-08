'use client'

import React, { useEffect, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import AdminToolbar from './AdminToolbar'

// 어드민 공용 리스트 — 순번(01,02…) + 필터/검색 박스(toolbar 슬롯) + 우측상단 페이지네이션(20개/페이지, 1페이지면 숨김).
// items 는 부모가 이미 필터링·정렬(최신 위)한 상태로 넘긴다. 순번 = 표시 인덱스(최상단 01, 페이지 넘어가면 이어짐).
// resetKey 가 바뀌면(=필터 변경) 1페이지로 리셋한다.

export interface AdminListColumn<T> {
  key: string
  header: string
  cell: (row: T) => React.ReactNode
  align?: 'left' | 'right'
  thClassName?: string
  tdClassName?: string
}

export interface AdminListProps<T> {
  items: T[]
  columns: AdminListColumn<T>[]
  getRowKey: (row: T) => string
  toolbar?: React.ReactNode
  exportButton?: React.ReactNode // 우측 메타 영역(건수·페이지네이션) 앞에 붙는 액션(엑셀 내보내기 등)
  pageSize?: number
  emptyLabel?: string
  rowClassName?: (row: T) => string
  resetKey?: string
  total?: number // 필터 이전 전체 건수 — 미검색 상태 "전체 N건" 표기용
  filterActive?: boolean // 필터/검색이 실제로 걸렸는지 — 걸렸을 때만 "검색결과 N건"
}

const PAD = (n: number) => String(n).padStart(2, '0')

export default function AdminList<T>({
  items,
  columns,
  getRowKey,
  toolbar,
  exportButton,
  pageSize = 15,
  emptyLabel = '데이터가 없습니다.',
  rowClassName,
  resetKey,
  total,
  filterActive,
}: AdminListProps<T>) {
  const [page, setPage] = useState(1)

  useEffect(() => {
    setPage(1)
  }, [resetKey])

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * pageSize
  const paged = items.slice(start, start + pageSize)
  const colCount = columns.length + 1 // + 순번

  return (
    <>
      {/* 필터/검색 박스 — 공용 AdminToolbar 셸. 단일 행: toolbar(좌) · 건수+페이지네이션(우 끝) */}
      <AdminToolbar
        className="mb-3"
        right={
          <>
            {exportButton}
            <p className="whitespace-nowrap text-[12px] font-[300] text-[#6b7280]">
              {filterActive ? '검색결과 ' : '전체 '}
              <span className="font-[600] tabular-nums text-[#1f2937]">{items.length}</span>건
              {filterActive && total != null && <span className="text-[#9ca3af]"> / 전체 {total}건</span>}
            </p>
            <InlinePagination page={safePage} totalPages={totalPages} onChange={setPage} />
          </>
        }
      >
        {toolbar}
      </AdminToolbar>

      <div className="overflow-hidden rounded-[12px] bg-white shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#eceef1] text-[12px] font-[500] text-[#9ca3af]">
              <th className="w-[52px] px-5 py-3">No.</th>
              {columns.map((c) => (
                <th
                  key={c.key}
                  className={`py-3 ${c.align === 'right' ? 'text-right' : ''} ${c.thClassName ?? 'px-2'}`}
                >
                  {c.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={colCount} className="px-5 py-16 text-center text-[13px] font-[300] text-[#9ca3af]">
                  {emptyLabel}
                </td>
              </tr>
            ) : (
              paged.map((row, i) => (
                <tr
                  key={getRowKey(row)}
                  className={`border-b border-[#f1f3f5] last:border-0 hover:bg-[#f9fafb] ${rowClassName?.(row) ?? ''}`}
                >
                  <td className="px-5 py-3.5 text-[12px] font-[400] tabular-nums text-[#b0b6be]">
                    {PAD(start + i + 1)}
                  </td>
                  {columns.map((c) => (
                    <td
                      key={c.key}
                      className={`py-3.5 ${c.align === 'right' ? 'text-right' : ''} ${c.tdClassName ?? 'px-2'}`}
                    >
                      {c.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  )
}

// 세그먼트 필터 필 — 프로그램/유형/상태 등 단일선택 탭.
export function AdminFilterPills<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { key: T; label: string }[]
  value: T
  onChange: (v: T) => void
}) {
  return (
    <div className="flex flex-wrap gap-1">
      {options.map((o) => {
        const active = o.key === value
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            className={`rounded-[7px] px-3 py-1.5 text-[12.5px] font-[500] transition-colors ${
              active ? 'bg-[#1e3a5f] text-white' : 'bg-white text-[#4b5563] hover:bg-[#e3e9ef]'
            }`}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

// 우측 상단 인라인 페이지네이션 — 1페이지면 렌더 안 함(20개 이하 자동 숨김). 정산 등 다른 리스트도 공용.
export function InlinePagination({
  page,
  totalPages,
  onChange,
}: {
  page: number
  totalPages: number
  onChange: (p: number) => void
}) {
  if (totalPages <= 1) return null
  return (
    <div className="flex shrink-0 items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="이전"
        className="rounded-[7px] p-1 text-[#9ca3af] transition-colors hover:bg-[#eef0f2] hover:text-[#1e3a5f] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[40px] text-center text-[12px] font-[300] tabular-nums text-[#6b7280]">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="다음"
        className="rounded-[7px] p-1 text-[#9ca3af] transition-colors hover:bg-[#eef0f2] hover:text-[#1e3a5f] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
