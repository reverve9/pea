'use client'

import React from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'
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

        {/* 우측 크롬: SNS 칩 + 어드민 진입(최우측, 새창) */}
        <div className="flex items-center gap-2">
          {sns && <SNSLinks urls={sns} variant="icon-sm" />}
          <Link
            href="/admin"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="관리자"
            title="관리자"
            className="flex h-6 w-6 items-center justify-center rounded-full bg-[#e0e0e0] text-[#777] transition-colors hover:bg-[#d5d5d5]"
          >
            <Lock size={12} />
          </Link>
        </div>
      </div>

      {/* 언더바 */}
      <div className="mt-3 border-b border-[#e5e7eb]" />
    </header>
  )
}
