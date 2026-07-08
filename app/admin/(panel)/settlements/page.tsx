import AdminHeader from '@/components/admin/AdminHeader'

// 정산 관리 — 스코프 미확정. 골격만 두고 세부(입금/환불 정산·집계)는 후속 지시에 맞춰 구현.
export const dynamic = 'force-dynamic'

export default function AdminSettlementsPage() {
  return (
    <>
      <AdminHeader title="정산 관리" desc="입금·환불 정산 및 집계" />
      <div className="rounded-[12px] border border-dashed border-[#dfe3e8] bg-white px-6 py-20 text-center">
        <p className="text-[14px] font-[500] text-[#4b5563]">정산 관리 준비 중</p>
        <p className="mt-1.5 text-[12.5px] font-[300] text-[#9ca3af]">
          정산 기준·항목이 확정되면 이 화면에 집계·내역이 표시됩니다.
        </p>
      </div>
    </>
  )
}
