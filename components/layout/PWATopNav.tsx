'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, isNavActive } from './navItems'

// 데스크탑(≥768) 상단 스티키 네비. #pwa-wrapper 스크롤 컨테이너 안이라 순수 sticky top-0 로 고정.
// 나인브릿지 텍스트 메뉴 원형(아이콘 없음) + 언어 위계만 반전: 국문(주) 위 / 영문(서브) 아래.
// 배경 시안 글로우는 나인브릿지 원본대로 active/hover 시 텍스트 뒤에 페이드. 모바일 하단바(아이콘+국문)는 별개 유지.
export default function PWATopNav() {
  const pathname = usePathname()
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <nav className="sticky top-0 z-50">
      <div className="bg-white/95 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,27,46,0.03)] border-b border-[#e2e8f0]/60">
        <div className="flex items-stretch justify-around px-3 py-[14px]">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href)
            const isHovered = hovered === item.href
            const showEffect = active || isHovered
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onMouseEnter={() => setHovered(item.href)}
                onMouseLeave={() => setHovered(null)}
                className="relative flex flex-col items-center justify-center gap-[4px] px-3 text-[#1e3a5f] transition-all duration-200"
              >
                {/* 나인브릿지 원형 배경 글로우(시안 리컬러) — active/hover 시 scale·opacity 페이드 */}
                <span
                  aria-hidden
                  className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[140px] h-[140px] rounded-full pointer-events-none transition-all duration-500 ease-out
                    ${showEffect ? 'scale-100 opacity-100' : 'scale-0 opacity-0'}`}
                  style={{
                    background: `radial-gradient(circle,
                      rgba(79,179,196,0.85) 0%,
                      rgba(79,179,196,0.75) 5%,
                      rgba(79,179,196,0.65) 10%,
                      rgba(79,179,196,0.55) 15%,
                      rgba(79,179,196,0.48) 20%,
                      rgba(79,179,196,0.42) 25%,
                      rgba(79,179,196,0.36) 30%,
                      rgba(79,179,196,0.30) 35%,
                      rgba(79,179,196,0.24) 40%,
                      rgba(79,179,196,0.18) 45%,
                      rgba(79,179,196,0.14) 50%,
                      rgba(79,179,196,0.10) 55%,
                      rgba(79,179,196,0.07) 60%,
                      rgba(79,179,196,0.04) 65%,
                      rgba(79,179,196,0.02) 70%,
                      rgba(79,179,196,0.01) 75%,
                      rgba(79,179,196,0) 80%
                    )`,
                  }}
                />

                {/* 국문 라벨 (주) — 위, 크게. active 진하게 */}
                <span
                  className={`relative text-[16px] leading-none tracking-[0.01em]
                    ${active ? 'font-semibold opacity-100' : 'font-medium opacity-85'}`}
                >
                  {item.labelKo}
                </span>

                {/* 영문 라벨 (서브) — 아래, 작게·대문자·자간. 로고 영문 어법 반향.
                    active/hover 시 진한 시안으로 켜서 배경 글로우에 묻히지 않게 함 */}
                <span
                  className={`relative text-[11px] leading-none tracking-[0.18em] font-medium transition-colors duration-200
                    ${active ? 'text-[#2f8ba0] opacity-100' : isHovered ? 'text-[#2f8ba0] opacity-100' : 'text-[#8aa0b8] opacity-70 font-normal'}`}
                >
                  {item.label}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
