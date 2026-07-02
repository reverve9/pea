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
      className={`bg-gradient-to-r from-[#394053] via-[#49526B] to-[#A2AED0] text-white px-4 h-[80px] flex items-center justify-between ${
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

      {/* 마이페이지 진입 (데·모 공통, 헤더 우측). 밝은 파스텔 우측 배경 → 흰 원형 칩 + 네이비 아이콘(반전, 로고 원형 마크와 호응). 아이콘 세트=lucide(앱 전역 통일). */}
      <Link
        href="/my"
        aria-label="마이페이지"
        className={`shrink-0 grid place-items-center rounded-full bg-white text-[#1e3a5f] hover:bg-white/85 transition-colors ${
          isDesktop ? 'h-10 w-10' : 'h-9 w-9'
        }`}
      >
        <UserRound size={isDesktop ? 22 : 20} strokeWidth={1.75} />
      </Link>
    </header>
  )
}
