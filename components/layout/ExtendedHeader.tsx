'use client'

import React from 'react'
import SNSLinks, { type SNSUrls } from '@/components/common/SNSLinks'

interface ExtendedHeaderProps {
  title: string // 국문 (주)
  eyebrow?: string // 영문 보조 — 로고 어법(PHYSICAL EDUCATION ASSOCIATION) 반향
  sns?: SNSUrls
}

// 우측(확장) 페인 상단 마스트헤드: 국문 타이틀(주) + 영문 eyebrow(서브) + SNS + 언더바.
// 참고이미지의 우측 헤더를 "언어 위계만 반전(국문 우세)"해 이식 → 메인헤더/로고 톤과 일치.
// 토큰(fluid-*, font-raleway)만 사용, 페이지엔 raw 스타일 없음(원칙1).
export default function ExtendedHeader({ title, eyebrow, sns }: ExtendedHeaderProps) {
  return (
    <header className="pt-4 mb-9">
      <div className="flex items-end justify-between gap-3">
        {/* 국문 주 + 영문 서브 (baseline 정렬) */}
        <div className="flex items-baseline gap-2.5">
          <h1 className="font-score text-[23px] font-[300] tracking-[2px] leading-none text-[#1e3a5f]">
            {title}
          </h1>
          {eyebrow && (
            <span className="font-raleway text-[13px] font-[400] tracking-[2px] uppercase text-[#2f8ba0]">
              {eyebrow}
            </span>
          )}
        </div>

        {/* SNS (site_settings 주입 전엔 빈 값이면 자동 숨김) */}
        {sns && <SNSLinks urls={sns} variant="icon-sm" />}
      </div>

      {/* 언더바 */}
      <div className="mt-3 border-b border-[#e5e7eb]" />
    </header>
  )
}
