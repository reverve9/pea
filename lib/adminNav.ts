// 어드민 사이드바 그룹 구성. 아이콘 키는 AdminSidebar의 ICONS 맵과 1:1.
// 모듈 범위는 [[admin-scope-criteria]] — 마이너·잦은 수정만. 코스/요금/사이트설정은 시드/코드(제외).
export type AdminNavItem = { href: string; label: string; icon: AdminIconKey }
export type AdminNavGroup = { title: string; items: AdminNavItem[] }

export type AdminIconKey =
  | 'LayoutDashboard'
  | 'ClipboardList'
  | 'Inbox'
  | 'MessageSquare'
  | 'Megaphone'
  | 'CalendarDays'
  | 'Award'
  | 'Calculator'

export const ADMIN_NAV: AdminNavGroup[] = [
  {
    title: '운영',
    items: [
      { href: '/admin', label: '대시보드', icon: 'LayoutDashboard' },
      { href: '/admin/applications', label: '신청 관리', icon: 'ClipboardList' },
      { href: '/admin/inquiries', label: '문의 관리', icon: 'MessageSquare' },
      { href: '/admin/certificates', label: '증명서 발급', icon: 'Award' },
      { href: '/admin/settlements', label: '정산 관리', icon: 'Calculator' },
    ],
  },
  {
    title: '설정',
    items: [
      { href: '/admin/sessions', label: '연수 관리', icon: 'CalendarDays' },
      { href: '/admin/board', label: '공지·FAQ', icon: 'Megaphone' },
    ],
  },
]
