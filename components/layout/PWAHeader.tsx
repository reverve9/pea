'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { UserRound } from 'lucide-react'

interface PWAHeaderProps {
  variant?: 'mobile' | 'desktop'
}

// Phase 2.5+: 헤더 배경 = 좌(짙은 슬레이트) → 우(파스텔 라벤더) 수평 그라데이션(참고 스크린샷).
// 로고(흰 워드마크)는 어두운 좌측에, 마이 아이콘은 밝은 우측에 → 아이콘은 네이비로 대비 확보.
export default function PWAHeader({ variant = 'mobile' }: PWAHeaderProps) {
  const isDesktop = variant === 'desktop'
  const pathname = usePathname()
  const onMy = pathname === '/my'

  return (
    <header
      className={`bg-gradient-to-r from-[#394053] via-[#49526B] to-[#A2AED0] text-white px-4 h-[80px] flex items-center justify-between ${
        isDesktop ? 'pt-[12px]' : 'standalone:sticky standalone:top-0 z-50'
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

      {/* 마이페이지 진입 — 데스크탑·모바일 공통 헤더 우측(원형 칩 + 하단 MY 라벨, NavItemChip 어법).
          주 네비 4개(프로그램·연수안내·신청·커뮤니티)와 층위가 달라 네비 바가 아니라 헤더에 둔다. */}
      <Link
        href="/my"
        aria-label="마이페이지"
        aria-current={onMy ? 'page' : undefined}
        className="group shrink-0 flex flex-col items-center gap-[4px]"
      >
        <span
          className={`grid h-8 w-8 place-items-center rounded-full transition-colors ${
            onMy ? 'bg-[#2f8ba0] text-white' : 'bg-white text-[#1e3a5f] group-hover:bg-white/85'
          }`}
        >
          <UserRound size={18} strokeWidth={1.75} />
        </span>
        <span className="text-[10px] font-medium leading-none tracking-[0.16em] text-white/90">MY</span>
      </Link>
    </header>
  )
}
