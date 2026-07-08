import AdminHeader from '@/components/admin/AdminHeader'
import { getSettlementData } from '@/lib/adminQueries'
import SettlementsClient from './SettlementsClient'

// 매 요청 최신 데이터(service_role 조회) — 캐시하지 않음.
export const dynamic = 'force-dynamic'

export default async function AdminSettlementsPage() {
  const data = await getSettlementData()
  return (
    <>
      <AdminHeader title="정산 관리" desc="입금확정 매출·환불·수수료 집계 (기준일=입금확인일)" />
      <SettlementsClient data={data} />
    </>
  )
}
