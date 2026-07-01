'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { NAV_ITEMS, isNavActive } from './navItems'

// 모바일(<768) 하단 네비바. 나인브릿지 구조·스타일 유지, 5개 항목 + 실제 라우트.
// 위치는 #pwa-wrapper(500px 페인) 기준으로 계산해 좌우 15px 여백.
export default function PWANavBar() {
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
    <nav className="fixed bottom-[40px] z-50" style={navStyle}>
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-gray-100">
        <div className="flex items-center justify-around py-2.5 px-2">
          {NAV_ITEMS.map((item) => {
            const active = isNavActive(pathname, item.href)
            const Icon = item.icon
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={`flex flex-col items-center justify-center gap-[6px] py-1 rounded-xl transition-all duration-200 w-[62px]
                  ${active ? 'text-[#b87a5a] scale-[1.15]' : 'text-gray-500 hover:text-[#b87a5a] hover:scale-[1.15]'}`}
              >
                <Icon size={20} strokeWidth={1.2} />
                <span className="fluid-nav-label font-light tracking-wide leading-none">
                  {item.labelKo}
                </span>
              </Link>
            )
          })}
        </div>
      </div>
      {/* Safe area for iOS */}
      <div className="pb-[env(safe-area-inset-bottom)]" />
    </nav>
  )
}
