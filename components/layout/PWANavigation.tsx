'use client'

import React, { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import PWAHeader from './PWAHeader'
import PWASubHeader from './PWASubHeader'
import PWANavBar from './PWANavBar'
import PWATopNav from './PWATopNav'
import SlimFooter from './SlimFooter'
import PwaInstallBanner from './PwaInstallBanner'
import { NAV_ITEMS, isNavActive } from './navItems'

// 주 네비에 없는 라우트(서브/유틸 페이지) → 모바일에서 하단 탭 대신 뒤로가기 앱바. 타이틀 맵(국문+영문).
const SUBPAGE_META: Record<string, { title: string; en: string }> = { '/my': { title: '마이페이지', en: 'MY PAGE' } }

// PWA 페인(500px) 안에서 콘텐츠를 네비 크롬으로 감싼다.
// 전환점 768px: 모바일=상단 헤더+하단 네비바 / 데스크탑=상단 헤더+스티키 상단네비.
export default function PWANavigation({ children }: { children: React.ReactNode }) {
  const [isMobile, setIsMobile] = useState(false)
  const pathname = usePathname()
  // 홈(/)은 리치 HomeFooter 전용 → 슬림 푸터 제외. 나머지 페이지에 공용 슬림 푸터.
  const showSlimFooter = pathname !== '/'
  // 서브페이지 = 홈도 아니고 주 네비 4항목에도 안 속하는 라우트(예: /my).
  const isSubPage = pathname !== '/' && !NAV_ITEMS.some((i) => isNavActive(pathname, i.href))
  const subMeta = SUBPAGE_META[pathname]

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  if (isMobile) {
    // 서브페이지: 하단 탭바 제거 + 뒤로가기 앱바(PWA 관행).
    if (isSubPage) {
      return (
        <div className="relative flex flex-col min-h-screen">
          <PWASubHeader title={subMeta?.title ?? ''} en={subMeta?.en} />
          <main className="flex-1 min-h-0 overflow-y-auto pb-10">
            <PwaInstallBanner />
            {children}
            {showSlimFooter && <SlimFooter />}
          </main>
        </div>
      )
    }
    return (
      <div className="relative flex flex-col min-h-screen">
        <PWAHeader variant="mobile" />
        <main className="flex-1 min-h-0 overflow-y-auto pb-28">
          <PwaInstallBanner />
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
