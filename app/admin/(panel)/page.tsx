import AdminHeader from '@/components/admin/AdminHeader'
import { BarChart3 } from 'lucide-react'

// 대시보드 — 전체 운영현황 통계 대시보드 연동 예정(플레이스홀더). 임시 통계카드 제거. [[admin-dashboard-deferred]]
export default function AdminDashboardPage() {
  return (
    <>
      <AdminHeader title="대시보드" desc="전체 운영 현황 요약" />
      <div className="flex min-h-[360px] flex-col items-center justify-center rounded-[12px] bg-white px-6 text-center shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-[#eef2f7]">
          <BarChart3 size={22} className="text-[#8a94a0]" />
        </div>
        <p className="text-[14px] font-[500] text-[#4b5563]">운영 현황 통계 준비 중</p>
        <p className="mt-1.5 max-w-[380px] text-[12.5px] font-[300] leading-relaxed text-[#9ca3af]">
          신청 · 입금 · 정산 등 전체 운영 현황을 한눈에 볼 수 있는 통계가 연동될 예정입니다.
        </p>
      </div>
    </>
  )
}
