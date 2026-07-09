'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, isNavActive } from './navItems'
import NavItemChip from './NavItemChip'

// 모바일(<768) 하단 네비바 — 콘텐츠 4개 공용 칩(NavItemChip). 플로팅 pill.
// 위치는 #pwa-wrapper(500px 페인) 기준으로 계산해 좌우 15px 여백.
// className = 표시 토글용(설치 PWA에서만 노출: 'hidden standalone:block').
export default function PWANavBar({ className = '' }: { className?: string }) {
  const pathname = usePathname()
  const [navStyle, setNavStyle] = useState({ left: '15px', right: '15px', width: 'auto' })

  useEffect(() => {
    const updatePosition = () => {
      const pwaWrapper = document.getElementById('pwa-wrapper')
      if (pwaWrapper) {
        const rect = pwaWrapper.getBoundingClientRect()
        setNavStyle({ left: `${rect.left + 15}px`, right: 'auto', width: `${rect.width - 30}px` })
      }
    }
    updatePosition()
    window.addEventListener('resize', updatePosition)
    return () => window.removeEventListener('resize', updatePosition)
  }, [])

  return (
    // 안전영역(홈 인디케이터 등) 위 16px 띄움 — 안전영역을 offset에 한 번만 포함(하단 스페이서 이중 적용 제거).
    <nav className={`fixed bottom-[calc(16px_+_env(safe-area-inset-bottom))] z-50 ${className}`} style={navStyle}>
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-[0_4px_16px_rgba(15,27,46,0.08)] border border-[#e2e8f0]">
        <div className="flex items-center justify-around py-2.5 px-2">
          {NAV_ITEMS.map((item) => (
            <NavItemChip key={item.href} item={item} active={isNavActive(pathname, item.href)} />
          ))}
        </div>
      </div>
    </nav>
  )
}
