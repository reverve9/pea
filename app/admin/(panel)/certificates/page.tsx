import AdminHeader from '@/components/admin/AdminHeader'
import { getCertificateRoster, getCashReceipts } from '@/lib/adminQueries'
import DocumentsClient from './DocumentsClient'

// 매 요청 최신 데이터(service_role 조회) — 캐시하지 않음.
export const dynamic = 'force-dynamic'

export default async function AdminCertificatesPage() {
  const [roster, receipts] = await Promise.all([getCertificateRoster(), getCashReceipts()])
  return (
    <>
      <AdminHeader title="발급 관리" desc="수료증 · 현금영수증 발급 내역" />
      <DocumentsClient roster={roster} receipts={receipts} />
    </>
  )
}
