'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, isNavActive } from './navItems'
import NavItemChip from './NavItemChip'

// 모바일 브라우저(비-standalone) 상단 내비 — 헤더 아래, 콘텐츠 4개 공용 칩(NavItemChip).
// 마이는 헤더(PWAHeader)가 담당 → 여기선 4개만.
// 위치: 이 레이아웃은 순수 CSS sticky가 #pwa-wrapper 안쪽 overflow-x-hidden 때문에 안 붙는다
//       → PWATopNav와 동일하게 #pwa-wrapper 스크롤을 감지해 80px 넘으면 fixed 로 전환(브라우저 모드에선 헤더가 스크롤 아웃).
// className = 표시 토글용(브라우저에서만 노출: 'standalone:hidden').
export default function PWATopNavMobile({ className = '' }: { className?: string }) {
  const pathname = usePathname()
  const [isScrolled, setIsScrolled] = useState(false)
  const [navStyle, setNavStyle] = useState<{ left: string; width: string }>({ left: '0px', width: '100%' })

  useEffect(() => {
    const pwaWrapper = document.getElementById('pwa-wrapper')

    const updatePosition = () => {
      if (!pwaWrapper) return
      const rect = pwaWrapper.getBoundingClientRect()
      setNavStyle({ left: `${rect.left}px`, width: `${rect.width}px` })
    }
    const handleScroll = () => {
      if (!pwaWrapper) return
      setIsScrolled(pwaWrapper.scrollTop > 80)
    }

    updatePosition()
    handleScroll()
    window.addEventListener('resize', updatePosition)
    pwaWrapper?.addEventListener('scroll', handleScroll)
    return () => {
      window.removeEventListener('resize', updatePosition)
      pwaWrapper?.removeEventListener('scroll', handleScroll)
    }
  }, [])

  return (
    <nav
      className={`z-40 ${isScrolled ? 'fixed top-0' : 'sticky top-0'} ${className}`}
      style={isScrolled ? navStyle : undefined}
    >
      {/* 바 — 테두리 대신 소프트 언더섀도로 분리([[no-borders-rule]]) */}
      <div className="bg-white/95 backdrop-blur-sm shadow-[0_2px_8px_rgba(15,27,46,0.06)]">
        <div className="flex items-center justify-around px-2 py-3.5">
          {NAV_ITEMS.map((item) => (
            <NavItemChip key={item.href} item={item} active={isNavActive(pathname, item.href)} />
          ))}
        </div>
      </div>
    </nav>
  )
}
