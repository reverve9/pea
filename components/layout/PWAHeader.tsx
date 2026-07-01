'use client'

import React from 'react'
import Link from 'next/link'
import { UserRound } from 'lucide-react'

interface PWAHeaderProps {
  variant?: 'mobile' | 'desktop'
}

// Phase 2.5: 딥네이비 솔리드 헤더(그라데이션 제거). 워드마크·높이·레이아웃 유지.
// 우측에 마이페이지 아이콘 진입(데스크탑·모바일 공통) → /my. 로고 자산/세부구성은 후속 사용자 지시.
export default function PWAHeader({ variant = 'mobile' }: PWAHeaderProps) {
  const isDesktop = variant === 'desktop'

  return (
    <header
      className={`bg-[#1e3a5f] text-white px-4 h-[80px] flex items-center justify-between ${
        isDesktop ? 'pt-[20px]' : 'sticky top-0 z-50'
      }`}
    >
      <Link href="/" className="flex items-baseline gap-3 min-w-0">
        <span
          className={`font-score font-[600] tracking-[1px] ${
            isDesktop ? 'text-[20px]' : 'text-[18px]'
          }`}
        >
          체육교육회
        </span>
        <p
          className={`font-light tracking-wide opacity-70 truncate ${
            isDesktop ? 'text-[14px]' : 'text-[12.5px]'
          }`}
        >
          함께 배우고 함께 성장합니다
        </p>
      </Link>

      {/* 마이페이지 진입 (데·모 공통, 헤더 우측) */}
      <Link
        href="/my"
        aria-label="마이페이지"
        className="shrink-0 flex flex-col items-center gap-0.5 text-white/90 hover:text-white transition-colors"
      >
        <UserRound size={isDesktop ? 22 : 20} strokeWidth={1.5} />
        <span className="text-[10px] font-light leading-none tracking-wide">마이</span>
      </Link>
    </header>
  )
}
