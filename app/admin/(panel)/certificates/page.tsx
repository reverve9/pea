import AdminHeader from '@/components/admin/AdminHeader'
import { getCertificateRoster } from '@/lib/adminQueries'
import CertificatesClient from './CertificatesClient'

// 매 요청 최신 데이터(service_role 조회) — 캐시하지 않음.
export const dynamic = 'force-dynamic'

export default async function AdminCertificatesPage() {
  const roster = await getCertificateRoster()
  return (
    <>
      <AdminHeader title="증명서 발급" desc="연수완료 참가자 수료증 발급현황" />
      <CertificatesClient roster={roster} />
    </>
  )
}
