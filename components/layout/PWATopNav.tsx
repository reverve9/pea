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
      <div className="bg-white/95 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,27,46,0.03)] border-b border-[#e2e8f0]/60">
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
                {/* 텍스트: 큰 영문 + 작은 한글 (타이포 패턴 유지, 색만 네이비) */}
                <span
                  className={`relative font-raleway text-[16px] font-light tracking-[0.05em] text-[#1e3a5f] leading-tight transition-opacity duration-200
                    ${showEffect ? 'opacity-100' : 'opacity-55'}`}
                >
                  {item.label}
                </span>
                <span
                  className={`relative text-[12px] font-extralight text-[#1e3a5f] leading-none transition-opacity duration-200
                    ${showEffect ? 'opacity-100' : 'opacity-55'}`}
                >
                  {item.labelKo}
                </span>
                {/* 활성 언더라인 — 프로스트 시안 극소량 */}
                {active && (
                  <span className="absolute left-2 right-2 -bottom-[7px] h-[2px] rounded-full bg-[#4fb3c4]" />
                )}
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
