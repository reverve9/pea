'use client'

import React from 'react'
import Link from 'next/link'
import { Lock } from 'lucide-react'

interface ExtendedHeaderProps {
  title: string // 국문 (주)
  eyebrow?: string // 영문 보조 — 로고 어법(PHYSICAL EDUCATION ASSOCIATION) 반향
}

// 우측(확장) 페인 상단 마스트헤드: 국문 타이틀(주) + 영문 eyebrow(서브) + 언더바.
// SNS는 올해 도입 계획 없어 미표시(오너 지시 2026-07-03). 우측엔 어드민 진입(자물쇠, 새창)만.
export default function ExtendedHeader({ title, eyebrow }: ExtendedHeaderProps) {
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

        {/* 어드민 진입 (새창) */}
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

      {/* 언더바 */}
      <div className="mt-3 border-b border-[#e5e7eb]" />
    </header>
  )
}
