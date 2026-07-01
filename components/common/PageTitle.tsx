'use client'

import React from 'react'

interface PageTitleProps {
  title: string
  subtitle?: string
}

// 나인브릿지 PageTitle 구조 유지. 데스크탑 27px 고정 / 모바일 fluid(원칙2)는
// globals.css `.fluid-page-title` clamp 에 위임(광폭에서 상한 27px 고정).
export default function PageTitle({ title, subtitle }: PageTitleProps) {
  return (
    <div className="px-4 py-5">
      <div className="flex items-baseline justify-start gap-2">
        <h1 className="fluid-page-title font-raleway tracking-[1.5px] font-[100] text-[#000000]">
          {title}
        </h1>
        {subtitle && <span className="fluid-subtitle font-[300] text-[#333333]">{subtitle}</span>}
      </div>
    </div>
  )
}
