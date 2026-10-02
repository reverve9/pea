import AdminHeader from '@/components/admin/AdminHeader'
import {
  getAllApplications,
  getAllSessions,
  getAllRefundRequests,
  getAllModificationRequests,
  getAllInquiries,
} from '@/lib/adminQueries'
import DashboardClient from './DashboardClient'

// 대시보드 — 처리 대기 · 핵심 지표 · 차수별 현황 · 신청 추이 · 참가자 구성(3차 수정: 최대한 많은 정보 + 차수별 구분).
// 집계는 클라이언트(유형·지난 차수 필터 즉시 반영). 소량 데이터라 기존 목록 쿼리를 그대로 재사용.
export const dynamic = 'force-dynamic'

export default async function AdminDashboardPage() {
  const [applications, sessions, refunds, modifications, inquiries] = await Promise.all([
    getAllApplications(),
    getAllSessions(),
    getAllRefundRequests(),
    getAllModificationRequests(),
    getAllInquiries(),
  ])
  return (
    <>
      <AdminHeader title="대시보드" desc="전체 운영 현황 요약 · 차수별 신청/입금/정원 현황" />
      <DashboardClient
        applications={applications}
        sessions={sessions}
        refunds={refunds.map((r) => ({ status: r.status }))}
        modifications={modifications.map((m) => ({ status: m.status }))}
        inquiries={inquiries.map((q) => ({ status: q.status }))}
      />
    </>
  )
}
