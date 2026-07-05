'use client'

import React from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ClipboardList,
  Inbox,
  MessageSquare,
  Megaphone,
  HelpCircle,
  CalendarDays,
  Award,
  LogOut,
} from 'lucide-react'
import { ADMIN_NAV, type AdminIconKey } from '@/lib/adminNav'

const ICONS: Record<AdminIconKey, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  ClipboardList,
  Inbox,
  MessageSquare,
  Megaphone,
  HelpCircle,
  CalendarDays,
  Award,
}

// /admin(대시보드)는 정확히 일치할 때만, 나머지는 하위 경로 포함.
function isActive(pathname: string, href: string) {
  if (href === '/admin') return pathname === '/admin'
  return pathname === href || pathname.startsWith(href + '/')
}

export default function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()

  async function logout() {
    await fetch('/api/admin/logout', { method: 'POST' })
    router.replace('/admin/login')
    router.refresh()
  }

  return (
    <aside className="flex w-[240px] flex-shrink-0 flex-col border-r border-[#eceef1] bg-white">
      {/* 로고 + Admin 뱃지 */}
      <div className="flex items-center gap-2 px-5 pt-6 pb-5">
        <span className="font-score text-[17px] font-[400] tracking-[1px] text-[#1e3a5f]">
          체육교육회
        </span>
        <span className="rounded-full bg-[#1e3a5f] px-2 py-[2px] text-[10px] font-[500] tracking-[0.5px] text-white">
          Admin
        </span>
      </div>

      {/* 로그인 계정 */}
      <div className="border-y border-[#f1f2f4] px-5 py-3">
        <p className="text-[12px] font-[300] text-[#9ca3af]">
          로그인 <span className="ml-1 font-[500] text-[#374151]">운영자</span>
        </p>
      </div>

      {/* 그룹 네비 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {ADMIN_NAV.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="px-2 pb-2 text-[11px] font-[500] tracking-[1px] text-[#b0b6be]">
              {group.title}
            </p>
            <ul className="space-y-[2px]">
              {group.items.map((item) => {
                const Icon = ICONS[item.icon]
                const active = isActive(pathname, item.href)
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={[
                        'flex items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13.5px] transition-colors',
                        active
                          ? 'bg-[#1e3a5f]/[0.07] font-[500] text-[#1e3a5f]'
                          : 'font-[300] text-[#6b7280] hover:bg-[#f6f7f8] hover:text-[#374151]',
                      ].join(' ')}
                    >
                      <Icon size={17} className={active ? 'text-[#1e3a5f]' : 'text-[#9ca3af]'} />
                      {item.label}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* 로그아웃 */}
      <div className="border-t border-[#f1f2f4] px-3 py-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13.5px] font-[300] text-[#6b7280] transition-colors hover:bg-[#f6f7f8] hover:text-[#374151]"
        >
          <LogOut size={17} className="text-[#9ca3af]" />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
