'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import PWAHeader from './PWAHeader'
import PWANavBar from './PWANavBar'
import PWATopNav from './PWATopNav'
import SlimFooter from './SlimFooter'

// PWA 페인(500px) 안에서 콘텐츠를 네비 크롬으로 감싼다.
// 전환점 768px: 모바일=상단 헤더+하단 네비바 / 데스크탑=상단 헤더+스티키 상단네비.
export default function PWANavigation({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  // 홈(/)은 리치 HomeFooter 전용 → 슬림 푸터 제외. 나머지 페이지에 공용 슬림 푸터.
  const showSlimFooter = pathname !== '/'

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    return (
      <div className="relative flex flex-col min-h-screen">
        <PWAHeader variant="mobile" />
        <main className="flex-1 min-h-0 overflow-y-auto pb-28">
          {children}
          {showSlimFooter && <SlimFooter />}
        </main>
        <PWANavBar />
      </div>
    )
  }

  return (
    <div className="relative flex flex-col min-h-screen">
      <PWAHeader variant="desktop" />
      <PWATopNav />
      {/* md:pt — 데스크탑은 PageTitle(md:hidden)이 없어 콘텐츠가 네비에 붙음 → 상단 여백을 공용으로 부여 */}
      <main className="flex-1 min-h-0 overflow-y-auto pt-12">
        {children}
        {showSlimFooter && <SlimFooter />}
      </main>
    </div>
  )
}
