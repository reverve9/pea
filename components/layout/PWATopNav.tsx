'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, isNavActive } from './navItems'

// 데스크탑(≥768) 상단 스티키 네비. #pwa-wrapper 스크롤 컨테이너 안이라 순수 sticky top-0 로 고정.
// 국문 메인 라벨(16px) + 나인브릿지 원형 배경 글로우(시안으로 리컬러) hover/active 효과. 언더라인 제거.
export default function PWATopNav() {
  const pathname = usePathname()
  const [hovered, setHovered] = useState<string | null>(null)

  return (
    <nav className="sticky top-0 z-50">
      <div className="bg-white/95 backdrop-blur-sm shadow-[0_1px_2px_rgba(15,27,46,0.03)] border-b border-[#e2e8f0]/60">
        {/* 아이콘 칩(34px)+국문 → 바 높이 ~70px 유지되도록 패딩 조정 (py 9) */}
        <div className="flex items-center justify-around px-3 py-[9px]">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href)
            const showEffect = active || hovered === item.href
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                onMouseEnter={() => setHovered(item.href)}
                onMouseLeave={() => setHovered(null)}
                className="relative flex flex-col items-center justify-center gap-[6px] px-2 text-[#1e3a5f] transition-all duration-200"
              >
                {/* 나인브릿지 원형 배경 글로우(시안 리컬러) — hover/active 시 scale·opacity 페이드 */}
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

                {/* 아이콘 원형 칩 — 선택: 네이비 채움+흰 아이콘 / 기본: 연한 틴트+뮤트 네이비. hover는 글로우만(칩은 active에만) */}
                <span
                  className={`relative grid place-items-center h-[34px] w-[34px] rounded-full transition-colors
                    ${active ? 'bg-[#1e3a5f] text-white' : 'bg-[#eaf0f6] text-[#3f5c7e]'}`}
                >
                  <Icon size={18} strokeWidth={1.6} />
                </span>

                {/* 국문 라벨: 칩이 강조를 맡아 축소(13px) + 기본 300 / 선택 500. hover엔 글자 불변 */}
                <span
                  className={`relative text-[13px] tracking-[0.12em] leading-none
                    ${active ? 'font-medium opacity-100' : 'font-light opacity-60'}`}
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
