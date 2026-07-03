import AdminHeader from '@/components/admin/AdminHeader'
import { getAllFaqs } from '@/lib/adminQueries'
import FaqsClient from './FaqsClient'

// 매 요청 최신 데이터(service_role 조회) — 캐시하지 않음.
export const dynamic = 'force-dynamic'

export default async function AdminFaqsPage() {
  const faqs = await getAllFaqs()
  return (
    <>
      <AdminHeader title="FAQ" desc="자주 묻는 질문 관리" />
      <FaqsClient faqs={faqs} />
    </>
  )
}
