'use client'

import React, { ReactNode } from 'react'

// 페이지 내 섹션 구분 제목. 큰 한글 + 작은 영문 보조. 토큰(fluid-*)만 사용.
export default function SectionTitle({
  title,
  en,
  right,
}: {
  title: string
  en?: string
  right?: ReactNode
}) {
  return (
    <div className="flex items-end justify-between gap-2 px-1 mb-3">
      <div className="flex items-baseline gap-2">
        <h2 className="fluid-subtitle font-[500] text-[#1f2937]">{title}</h2>
        {en && <span className="fluid-nav-label font-raleway font-[300] text-[#9ca3af]">{en}</span>}
      </div>
      {right}
    </div>
  )
}
