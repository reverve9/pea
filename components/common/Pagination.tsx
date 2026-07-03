'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

// 공용 페이지네이션 — prev/next + n/total. 1페이지면 렌더 안 함.
export default function Pagination({
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
    <div className="flex items-center justify-center gap-2 pt-4">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        aria-label="이전"
        className="rounded-[7px] p-1.5 text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#1e3a5f] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronLeft size={16} />
      </button>
      <span className="min-w-[44px] text-center text-[12px] font-[300] tabular-nums text-[#6b7280]">
        {page} / {totalPages}
      </span>
      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
        aria-label="다음"
        className="rounded-[7px] p-1.5 text-[#9ca3af] transition-colors hover:bg-[#f3f4f6] hover:text-[#1e3a5f] disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  )
}
