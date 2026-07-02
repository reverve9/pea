'use client'

import React, { ReactNode } from 'react'

// 페이지 내 섹션 구분 제목. 홈 톤: 국문(S-Core Dream·네이비) + 영문 보조(Raleway·시안).
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
        <h2 className="font-score text-[clamp(1rem,4vw,1.1875rem)] font-[700] leading-tight text-[#1e3a5f]">
          {title}
        </h2>
        {en && (
          <span className="font-raleway text-[11px] font-[500] tracking-[1.5px] uppercase text-[#2f8ba0]">
            {en}
          </span>
        )}
      </div>
      {right}
    </div>
  )
}
