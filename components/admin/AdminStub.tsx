import AdminHeader from './AdminHeader'

// 골격 단계 모듈 자리표시자. 세부 CRUD는 후속 단계에서 교체.
export default function AdminStub({ title, desc }: { title: string; desc?: string }) {
  return (
    <>
      <AdminHeader title={title} desc={desc} />
      <div className="flex min-h-[300px] items-center justify-center rounded-[12px] bg-white shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
        <p className="text-[13px] font-[300] text-[#9ca3af]">준비 중 — 곧 제공됩니다.</p>
      </div>
    </>
  )
}
