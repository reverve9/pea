'use client'

import React, { ReactNode } from 'react'
import PWANavigation from './PWANavigation'

interface AppShellProps {
  // PWA 페인(모바일 단일컬럼 / 데스크탑 좌 500px)에 들어갈 주 콘텐츠. 네비 크롬으로 감싸진다.
  main: ReactNode
  // 확장 페인(데스크탑 ≥768 우측 780px 전용). 모바일에서는 숨김.
  extended?: ReactNode
}

// 나인브릿지 MainLayout 을 App Router 라우트 기반으로 적응:
// 3컬럼 [좌 gutter | 1280 중앙(500+780) | 우 gutter], 와이드 gutter 음영 그대로.
// 페이지가 main/extended 두 페인을 채운다(useState 메뉴 전환 대신 실제 라우트).
export default function AppShell({ main, extended }: AppShellProps) {
  return (
    <div className="h-screen bg-[#ffffff] overflow-hidden">
      <div className="flex h-screen">
        {/* 좌측 gutter — macOS 스타일 음영 (xl 이상에서만) */}
        <div className="hidden xl:flex flex-1 min-w-0">
          <div className="ml-auto w-[60px] h-full bg-gradient-to-r from-transparent via-black/[0.02] to-black/[0.08]" />
        </div>

        {/* 가운데 고정 영역 (1280px = 500 + 780) */}
        <div className="flex w-full min-[500px]:w-[500px] md:w-[1280px] flex-shrink-0 mx-auto md:mx-0">
          {/* PWA 페인 (모바일 full / 데스크탑 500px) */}
          <div className="relative w-full md:w-[500px] flex-shrink-0 h-screen z-10">
            <div id="pwa-wrapper" className="w-full h-full overflow-y-auto custom-scrollbar">
              <div className="bg-white min-h-screen relative overflow-x-hidden shadow-[0_0_1px_rgba(0,0,0,0.1)]">
                <PWANavigation>{main}</PWANavigation>
              </div>
            </div>
            {/* PWA 우측 음영 */}
            <div className="hidden md:block absolute top-0 left-full w-[40px] h-full bg-gradient-to-r from-black/[0.08] via-black/[0.02] to-transparent pointer-events-none" />
          </div>

          {/* 확장 페인 (≥768 전용, 780px 고정) */}
          <div className="hidden md:block w-[780px] flex-shrink-0 h-screen overflow-y-auto custom-scrollbar">
            <div className="pl-[40px] pr-[20px] pt-[25px] pb-[50px]">{extended}</div>
          </div>
        </div>

        {/* 우측 gutter (xl 이상, 여백) */}
        <div className="hidden xl:block flex-1 min-w-0" />
      </div>
    </div>
  )
}
