import AdminSidebar from '@/components/admin/AdminSidebar'

// 어드민 패널 셸 — 공용 AppShell(공개 사이트)과 분리된 별 셸. 좌 사이드바 + 우 콘텐츠.
// 미들웨어(middleware.ts)가 세션 게이트 → 여기 도달하면 인증된 상태. /admin/login은 이 그룹 밖.
export default function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-[#f7f8f9]">
      <AdminSidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-[1400px] px-8 py-8">{children}</div>
      </main>
    </div>
  )
}
