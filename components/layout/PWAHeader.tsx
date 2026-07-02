'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { UserRound } from 'lucide-react'

interface PWAHeaderProps {
  variant?: 'mobile' | 'desktop'
}

// Phase 2.5+: 딥네이비 솔리드 헤더(전체 화이트 톤의 유일한 컬러 포인트).
// 협회 로고(네이비 헤더용 변형 — 컬러 마크 + 흰 워드마크) 이미지 사용. 우측 마이페이지 진입 → /my.
export default function PWAHeader({ variant = 'mobile' }: PWAHeaderProps) {
  const isDesktop = variant === 'desktop'

  return (
    <header
      className={`bg-[#1e3a5f] text-white px-4 h-[80px] flex items-center justify-between ${
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
