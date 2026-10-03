import { redirect } from 'next/navigation'
import AdminSidebar from '@/components/admin/AdminSidebar'
import { getAdminSession } from '@/lib/adminGuard'

// 어드민 패널 셸 — 공용 AppShell(공개 사이트)과 분리된 별 셸. 좌 사이드바 + 우 콘텐츠.
// 미들웨어(middleware.ts)가 쿠키 서명 게이트, 여기서 admin_users 재확인(관리자에서 빠진 계정 차단). /admin/login은 이 그룹 밖.
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession()
  if (!session) redirect('/admin/login')
  return (
    <div className="flex h-screen bg-[#f7f8f9]">
      <AdminSidebar email={session.email} />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
