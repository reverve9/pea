'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { UserRound } from 'lucide-react'

interface PWAHeaderProps {
  variant?: 'mobile' | 'desktop'
}

// Phase 2.5+: 헤더 배경 = 좌(짙은 슬레이트) → 우(파스텔 라벤더) 수평 그라데이션(참고 스크린샷).
// 로고(흰 워드마크)는 어두운 좌측에, 마이 아이콘은 밝은 우측에 → 아이콘은 네이비로 대비 확보.
export default function PWAHeader({ variant = 'mobile' }: PWAHeaderProps) {
  const isDesktop = variant === 'desktop'

  return (
    <header
      className={`bg-[linear-gradient(90deg,#394053_0%,#49526B_50%,#A2AED0_100%)] text-white px-4 h-[80px] flex items-center justify-between ${
        isDesktop ? 'pt-[12px]' : 'sticky top-0 z-50'
      }`}
    >
      <Link href="/" className="flex items-center min-w-0" aria-label="체육교육회 홈">
        <Image
          src="/logo/pea-logo-header.png"
          alt="체육교육회 — Physical Education Association"
          width={1890}
          height={400}
          priority
          className={`w-auto ${isDesktop ? 'h-[40px]' : 'h-[38px]'}`}
        />
      </Link>

      {/* 마이페이지 진입 (데·모 공통, 헤더 우측). 밝은 우측 배경 → 네이비 아이콘. 아이콘: lucide UserRound(=SF Symbol 아님). */}
      <Link
        href="/my"
        aria-label="마이페이지"
        className="shrink-0 flex items-center text-[#1e3a5f] hover:opacity-70 transition-opacity"
      >
        <UserRound size={isDesktop ? 28 : 26} strokeWidth={1.75} />
      </Link>
    </header>
  )
}
