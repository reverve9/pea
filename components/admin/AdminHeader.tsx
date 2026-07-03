// 어드민 페이지 공용 헤더 — 타이틀 + 보조설명.
export default function AdminHeader({ title, desc }: { title: string; desc?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-[22px] font-[600] tracking-[-0.2px] text-[#1f2937]">{title}</h1>
      {desc && <p className="mt-1 text-[13px] font-[300] text-[#9ca3af]">{desc}</p>}
    </div>
  )
}
