import type { LucideIcon } from 'lucide-react'
import { GraduationCap, CalendarDays, ClipboardPen, MessagesSquare } from 'lucide-react'

// 콘텐츠 네비 4개 (프로그램/연수안내/신청/커뮤니티) — IA 확정안(docs/ia-decisions.md).
// 소개 전용 메뉴 없음(홈이 담당). 홈=로고 진입, 마이=헤더 아이콘(PWAHeader). /my 라우트 유지.
// 라벨 위계: 국문(주) + 영문 서브(로고 어법 반향).
export interface NavItem {
  href: string
  label: string // 영문 보조 표기
  labelKo: string // 한글
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/program', label: 'PROGRAM', labelKo: '프로그램', icon: GraduationCap },
  { href: '/courses', label: 'COURSE', labelKo: '연수안내', icon: CalendarDays },
  { href: '/apply', label: 'APPLY', labelKo: '신청', icon: ClipboardPen },
  { href: '/community', label: 'COMMUNITY', labelKo: '커뮤니티', icon: MessagesSquare },
]

// 현재 경로가 특정 네비 항목에 속하는지 (하위 경로 포함).
export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
