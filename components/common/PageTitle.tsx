'use client'

import React from 'react'

interface PageTitleProps {
  title: string // 국문 (주)
  en?: string // 영문 아이브로우 (서브)
}

// 페이지 상단 헤더. 홈 정체성 계승: 영문 아이브로우(Raleway·시안) 위 + 국문 타이틀(S-Core Dream·네이비).
// ⚠ 사이즈는 rem+vw clamp(모바일 유동 / 데스크탑 상한) — PWA 페인에 안전(cqi 컨테이너 의존 없음, fixed 나비 안 가둠).
// 패딩(px-4)은 기존 유지 → 하위 px-4 섹션들과 정렬 유지.
// ⚠ md:hidden — 데스크탑은 상단 네비(PWATopNav)가 활성 메뉴로 페이지명을 이미 announce하므로 여기서 반복하면 메아리.
//   모바일은 네비가 하단바라 상단에 페이지명이 없음 → 여기가 유일한 "여기가 어디" 표시라 노출 유지.
export default function PageTitle({ title, en }: PageTitleProps) {
  // 데스크탑 우측(ExtendedHeader)과 동일한 처리: 가로 인라인(국문 font-300 + 영문 font-400 baseline) + 언더바.
  return (
    <div className="px-4 pt-6 pb-3 md:hidden">
      <div className="flex items-baseline gap-2.5">
        <h1 className="font-score text-[23px] font-[300] tracking-[-0.2px] leading-none text-[#1e3a5f]">
          {title}
        </h1>
        {en && (
          <span className="font-raleway text-[13px] font-[400] tracking-[2px] uppercase text-[#2f8ba0]">
            {en}
          </span>
        )}
      </div>
      <div className="mt-3 border-b border-[#e5e7eb]" />
    </div>
  )
}
