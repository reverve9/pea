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
  CalendarDays,
  Award,
  Calculator,
  LogOut,
} from 'lucide-react'
import { ADMIN_NAV, type AdminIconKey } from '@/lib/adminNav'

const ICONS: Record<AdminIconKey, React.ComponentType<{ size?: number; className?: string }>> = {
  LayoutDashboard,
  ClipboardList,
  Inbox,
  MessageSquare,
  Megaphone,
  CalendarDays,
  Award,
  Calculator,
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
    <aside className="flex w-[240px] flex-shrink-0 flex-col bg-[#152a46] text-white">
      {/* 로고 + Admin 뱃지 */}
      <div className="flex items-center gap-2 px-5 pt-6 pb-5">
        <span className="font-score text-[17px] font-[400] tracking-[1px] text-white">
          체육교육회
        </span>
        <span className="rounded-full bg-white/[0.16] px-2 py-[2px] text-[10px] font-[500] tracking-[0.5px] text-white">
          Admin
        </span>
      </div>

      {/* 로그인 계정 */}
      <div className="border-y border-white/[0.1] px-5 py-3">
        <p className="text-[12px] font-[300] text-white/50">
          로그인 <span className="ml-1 font-[500] text-white">운영자</span>
        </p>
      </div>

      {/* 그룹 네비 */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {ADMIN_NAV.map((group) => (
          <div key={group.title} className="mb-5">
            <p className="px-2 pb-2 text-[11px] font-[500] tracking-[1px] text-white/40">
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
                          ? 'bg-white/[0.14] font-[500] text-white'
                          : 'font-[300] text-white/70 hover:bg-white/[0.08] hover:text-white',
                      ].join(' ')}
                    >
                      <Icon size={17} className={active ? 'text-white' : 'text-white/50'} />
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
      <div className="border-t border-white/[0.1] px-3 py-3">
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-2 text-[13.5px] font-[300] text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
        >
          <LogOut size={17} className="text-white/50" />
          로그아웃
        </button>
      </div>
    </aside>
  )
}
