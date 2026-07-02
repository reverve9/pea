'use client'

import React, { ReactNode } from 'react'

// 페이지 내 섹션 구분 제목. 국문(S-Core Dream·네이비)만 — 영문/시안은 페이지 헤더 전용.
// en prop은 하위호환용으로 타입엔 유지하되 렌더 안 함(호출부 무변경).
export default function SectionTitle({
  title,
  right,
}: {
  title: string
  en?: string
  right?: ReactNode
}) {
  // 영문(en)은 의도적으로 렌더 안 함 — 영문/시안 아이브로우는 페이지 헤더(정체성) 전용, 섹션 라벨은 국문만.
  return (
    <div className="flex items-end justify-between gap-2 px-1 mb-3">
      <div>
        {/* 포인트 바 — 시그니처 시안 액센트 */}
        <span className="block w-6 h-[2px] rounded-full bg-[#2f8ba0] mb-2" />
        <h2 className="font-score text-[clamp(0.9375rem,3.6vw,1.0625rem)] font-[500] leading-tight text-[#1e3a5f]">
          {title}
        </h2>
      </div>
      {right}
    </div>
  )
}
