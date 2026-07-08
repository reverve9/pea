import AdminHeader from '@/components/admin/AdminHeader'
import { getAllNotices, getAllFaqs } from '@/lib/adminQueries'
import BoardTabs from './BoardTabs'

// 매 요청 최신 데이터(service_role 조회) — 캐시하지 않음.
export const dynamic = 'force-dynamic'

// 공지사항 + FAQ 결합 페이지(우측 탭). 각 탭은 기존 NoticesClient·FaqsClient 재사용.
export default async function AdminBoardPage() {
  const [notices, faqs] = await Promise.all([getAllNotices(), getAllFaqs()])
  return (
    <>
      <AdminHeader title="공지·FAQ" desc="공지사항·자주 묻는 질문 관리" />
      <BoardTabs notices={notices} faqs={faqs} />
    </>
  )
}
