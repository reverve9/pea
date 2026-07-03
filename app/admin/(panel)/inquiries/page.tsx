import AdminHeader from '@/components/admin/AdminHeader'
import { getAllInquiries } from '@/lib/adminQueries'
import InquiriesClient from './InquiriesClient'

// 매 요청 최신 데이터(service_role 조회) — 캐시하지 않음.
export const dynamic = 'force-dynamic'

export default async function AdminInquiriesPage() {
  const inquiries = await getAllInquiries()
  return (
    <>
      <AdminHeader title="문의 관리" desc="1:1 문의 답변" />
      <InquiriesClient inquiries={inquiries} />
    </>
  )
}
