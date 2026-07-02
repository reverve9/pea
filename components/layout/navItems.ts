import type { LucideIcon } from 'lucide-react'
import { Building2, GraduationCap, ClipboardPen, MessagesSquare } from 'lucide-react'

// 콘텐츠 네비 4개 (기관소개/연수안내/연수신청/커뮤니티). Phase 2.5에서 마이페이지 분리
// → 헤더 우측 아이콘(PWAHeader)으로 이동. /my 라우트는 유지, 진입 위치만 변경.
// 나인브릿지의 "큰 영문 + 작은 한글" 패턴 유지. 실제 App Router 라우트.
export interface NavItem {
  href: string
  label: string // 영문 보조 표기
  labelKo: string // 한글
  icon: LucideIcon
}

export const NAV_ITEMS: NavItem[] = [
  { href: '/about', label: 'HOME', labelKo: '소개', icon: Building2 },
  { href: '/courses', label: 'PROGRAM', labelKo: '프로그램', icon: GraduationCap },
  { href: '/apply', label: 'APPLY', labelKo: '신청', icon: ClipboardPen },
  { href: '/community', label: 'NEWS', labelKo: '공지 및 소식', icon: MessagesSquare },
]

// 현재 경로가 특정 네비 항목에 속하는지 (하위 경로 포함).
export function isNavActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/'
  return pathname === href || pathname.startsWith(`${href}/`)
}
