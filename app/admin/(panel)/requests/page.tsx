import AdminHeader from '@/components/admin/AdminHeader'
import { getAllRefundRequests, getAllModificationRequests } from '@/lib/adminQueries'
import RequestsClient from './RequestsClient'

// 매 요청 최신 데이터(service_role 조회) — 캐시하지 않음.
export const dynamic = 'force-dynamic'

export default async function AdminRequestsPage() {
  const [refunds, modifications] = await Promise.all([
    getAllRefundRequests(),
    getAllModificationRequests(),
  ])
  return (
    <>
      <AdminHeader title="요청 관리" desc="환불·수정 요청 처리" />
      <RequestsClient refunds={refunds} modifications={modifications} />
    </>
  )
}
