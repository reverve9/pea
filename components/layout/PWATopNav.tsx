'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, isNavActive } from './navItems'

// 데스크탑(≥768) 상단 스티키 네비. #pwa-wrapper 스크롤 컨테이너 안이라 순수 sticky top-0 로 고정.
// 나인브릿지의 원형 그라데이션 호버 효과 + "큰 영문 / 작은 한글" 유지, 5개 항목 + 실제 라우트.
export default function PWATopNav() {
  const pathname = usePathname()
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <nav className="sticky top-0 z-50">
      <div className="bg-white/95 backdrop-blur-sm shadow-[0_1px_2px_rgba(0,0,0,0.03)] border-b border-gray-100/50">
        <div className="flex items-center justify-around px-3 py-[13px]">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href)
            const showEffect = active || hovered === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onMouseEnter={() => setHovered(item.href)}
                onMouseLeave={() => setHovered(null)}
                className="relative flex flex-col items-start justify-center gap-[4px] py-1 px-2 transition-all duration-200"
              >
                {/* 원형 그라데이션 배경 (블러 효과 대체) */}
                <div
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] rounded-full pointer-events-none transition-all duration-500 ease-out
                    ${showEffect ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                  style={{
                    background:
                      'radial-gradient(circle, rgba(184,122,90,0.85) 0%, rgba(184,122,90,0.55) 15%, rgba(184,122,90,0.30) 35%, rgba(184,122,90,0.14) 50%, rgba(184,122,90,0.04) 65%, rgba(184,122,90,0) 80%)',
                  }}
                />
                {/* 텍스트: 큰 영문 + 작은 한글 */}
                <span
                  className={`relative font-raleway text-[16px] font-light tracking-[0.05em] text-[#000000] leading-tight transition-opacity duration-200
                    ${showEffect ? 'opacity-100' : 'opacity-70'}`}
                >
                  {item.label}
                </span>
                <span
                  className={`relative text-[12px] font-extralight text-[#000000] leading-none transition-opacity duration-200
                    ${showEffect ? 'opacity-100' : 'opacity-70'}`}
                >
                  {item.labelKo}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
