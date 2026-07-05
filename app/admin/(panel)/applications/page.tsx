import AdminHeader from '@/components/admin/AdminHeader'
import { getAllApplications } from '@/lib/adminQueries'
import ApplicationsClient from './ApplicationsClient'

// 매 요청 최신 데이터(service_role 조회) — 캐시하지 않음.
export const dynamic = 'force-dynamic'

export default async function AdminApplicationsPage() {
  const applications = await getAllApplications()
  return (
    <>
      <AdminHeader title="신청 관리" desc="연수 신청 조회·상태변경·입금확인" />
      <ApplicationsClient applications={applications} />
    </>
  )
}
