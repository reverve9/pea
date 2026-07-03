import AdminHeader from '@/components/admin/AdminHeader'

// 대시보드 — 골격 단계는 통계카드 자리(값 placeholder). 실집계는 후속(신청/요청 연동 시).
const STATS: { label: string; accent?: string }[] = [
  { label: '총 신청' },
  { label: '승인 대기', accent: '#c2751a' },
  { label: '승인', accent: '#2f7d5a' },
  { label: '반려/취소', accent: '#c0392b' },
]

export default function AdminDashboardPage() {
  return (
    <>
      <AdminHeader title="대시보드" desc="운영 현황 요약" />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {STATS.map((s) => (
          <div
            key={s.label}
            className="rounded-[12px] border border-[#eceef1] bg-white px-5 py-4"
          >
            <p className="text-[12.5px] font-[300] text-[#9ca3af]">{s.label}</p>
            <p
              className="mt-1 text-[26px] font-[600] leading-none"
              style={{ color: s.accent ?? '#1f2937' }}
            >
              —
            </p>
          </div>
        ))}
      </div>

      <div className="mt-6 flex min-h-[220px] items-center justify-center rounded-[12px] border border-[#eceef1] bg-white">
        <p className="text-[13px] font-[300] text-[#9ca3af]">
          집계·최근 활동은 후속 단계에서 연동됩니다.
        </p>
      </div>
    </>
  )
}
