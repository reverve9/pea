'use client'

import React, { useState, useEffect } from 'react'
import PWAHeader from './PWAHeader'
import PWANavBar from './PWANavBar'
import PWATopNav from './PWATopNav'

// PWA 페인(500px) 안에서 콘텐츠를 네비 크롬으로 감싼다.
// 전환점 768px: 모바일=상단 헤더+하단 네비바 / 데스크탑=상단 헤더+스티키 상단네비.
export default function PWANavigation({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)

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
        <main className="flex-1 overflow-y-auto pb-28">{children}</main>
        <PWANavBar />
      </div>
    )
  }

  return (
    <div className="relative flex flex-col min-h-screen">
      <PWAHeader variant="desktop" />
      <PWATopNav />
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
