'use client'

import React from 'react'

interface PageTitleProps {
  title: string // 국문 (주)
  en?: string // 영문 아이브로우 (서브)
}

// 페이지 상단 헤더. 홈 정체성 계승: 영문 아이브로우(Raleway·시안) 위 + 국문 타이틀(S-Core Dream·네이비).
// ⚠ 사이즈는 rem+vw clamp(모바일 유동 / 데스크탑 상한) — PWA 페인에 안전(cqi 컨테이너 의존 없음, fixed 나비 안 가둠).
// 패딩(px-4)은 기존 유지 → 하위 px-4 섹션들과 정렬 유지.
export default function PageTitle({ title, en }: PageTitleProps) {
  return (
    <div className="px-4 pt-6 pb-3">
      {en && (
        <p className="font-raleway text-[11px] font-[500] tracking-[2.5px] uppercase text-[#2f8ba0] mb-1.5">
          {en}
        </p>
      )}
      <h1 className="font-score text-[clamp(1.375rem,5.5vw,1.625rem)] font-[700] leading-tight tracking-[-0.2px] text-[#1e3a5f]">
        {title}
      </h1>
    </div>
  )
}
