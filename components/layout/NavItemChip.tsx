'use client'

import React from 'react'
import Link from 'next/link'
import type { NavItem } from './navItems'

// 모바일 내비 공용 아이템 — 아이콘 칩(rounded-xl) + 하단 국문 라벨.
// 상단(브라우저 PWATopNavMobile) / 하단(PWA PWANavBar) 양쪽에서 동일하게 사용.
// 셀렉 = 바텀 스타일 유지: 아이템 전체 scale-[1.15] + 칩 솔리드 채움(테두리·글로우 없음, [[no-borders-rule]]).
export default function NavItemChip({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon
  return (
    <Link
      href={item.href}
      aria-current={active ? 'page' : undefined}
      className={`flex w-[62px] flex-col items-center justify-center gap-[6px] transition-transform duration-200 ${
        active ? 'scale-[1.15]' : 'hover:scale-[1.1]'
      }`}
    >
      {/* 아이콘 칩 — 비활성 연틴트 / 활성 솔리드 네이비(하단내비 활성색 통일) */}
      <span
        className={`grid h-9 w-9 place-items-center rounded-xl transition-colors duration-200 ${
          active ? 'bg-[#1e3a5f] text-white' : 'bg-[#1e3a5f]/[0.06] text-[#94a3b8]'
        }`}
      >
        <Icon size={20} strokeWidth={1.5} />
      </span>
      {/* 국문 라벨 — 활성 네이비 / 비활성 회색 */}
      <span
        className={`font-score fluid-nav-label font-light leading-none tracking-wide transition-colors duration-200 ${
          active ? 'text-[#1e3a5f]' : 'text-[#94a3b8]'
        }`}
      >
        {item.labelKo}
      </span>
    </Link>
  )
}
