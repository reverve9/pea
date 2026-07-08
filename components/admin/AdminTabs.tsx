'use client'

import React from 'react'

// 어드민 공용 탭(세그먼트) — 정본 패턴 = 신청관리 programTabs(솔리드 네이비 활성).
// 규칙: 어드민에서 탭이 필요하면 이 컴포넌트를 쓴다(인라인 재구현 금지). count 는 선택.
export interface AdminTab<K extends string = string> {
  key: K
  label: string
  count?: number
}

export default function AdminTabs<K extends string>({
  tabs,
  value,
  onChange,
  className = '',
}: {
  tabs: AdminTab<K>[]
  value: K
  onChange: (key: K) => void
  className?: string
}) {
  return (
    <div className={`flex w-fit overflow-hidden ${className}`}>
      {tabs.map((t) => {
        const active = value === t.key
        return (
          <button
            key={t.key}
            type="button"
            onClick={() => onChange(t.key)}
            className={`px-4 py-2 text-[12.5px] font-[500] transition-colors ${
              active ? 'bg-[#1e3a5f] text-white' : 'bg-white text-[#4b5563] hover:bg-[#e3e9ef]'
            }`}
          >
            {t.label}
            {t.count != null && (
              <span
                className={`ml-1.5 text-[11.5px] font-[400] tabular-nums ${active ? 'text-white/70' : 'text-[#b0b6be]'}`}
              >
                {t.count}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}
