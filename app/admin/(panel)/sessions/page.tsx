import AdminHeader from '@/components/admin/AdminHeader'
import {
  getAllSessions,
  getSelectableCourses,
  getAllPriceItems,
  getAllSessionOverrides,
} from '@/lib/adminQueries'
import SessionsClient from './SessionsClient'

// 매 요청 최신 데이터(service_role 조회 + 신청현황 집계) — 캐시하지 않음.
export const dynamic = 'force-dynamic'

export default async function AdminSessionsPage() {
  const [sessions, courses, priceItems, overrides] = await Promise.all([
    getAllSessions(),
    getSelectableCourses(),
    getAllPriceItems(),
    getAllSessionOverrides(),
  ])
  // 요금 조정 모달엔 활성 기본가만 노출(비활성 항목은 신청 폼에 안 뜨므로 조정 대상 아님).
  const activeItems = priceItems.filter((p) => p.is_active)
  return (
    <>
      <AdminHeader title="연수 관리" desc="차수 개설·일정·정원 · 기본/차수별 요금 (신청 현황은 신청 관리)" />
      <SessionsClient
        sessions={sessions}
        courses={courses}
        priceItems={activeItems}
        overrides={overrides}
      />
    </>
  )
}
