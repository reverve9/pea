'use client'

import React from 'react'
import Link from 'next/link'

interface PWAHeaderProps {
  variant?: 'mobile' | 'desktop'
}

// 나인브릿지 그라데이션 헤더 구조 그대로. 로고 이미지 자산이 없어 텍스트 워드마크로 대체
// (자산·톤은 후속 Phase에서 교체). 배경 그라데이션·높이·레이아웃은 원본 유지.
const GRADIENT = { background: 'linear-gradient(to right, #384155, #46526d, #9eafd4)' }

export default function PWAHeader({ variant = 'mobile' }: PWAHeaderProps) {
  const isDesktop = variant === 'desktop'

  return (
    <header
      className={`text-white px-4 h-[80px] flex flex-col justify-center ${
        isDesktop ? 'pt-[20px]' : 'sticky top-0 z-50'
      }`}
      style={GRADIENT}
    >
      <Link href="/" className="flex items-baseline gap-3">
        <span
          className={`font-score font-[600] tracking-[1px] ${
            isDesktop ? 'text-[20px]' : 'text-[18px]'
          }`}
        >
          체육교육회
        </span>
        <p
          className={`font-light tracking-wide opacity-70 ${
            isDesktop ? 'text-[14px]' : 'text-[12.5px]'
          }`}
        >
          함께 배우고 함께 성장합니다
        </p>
      </Link>
    </header>
  )
}
