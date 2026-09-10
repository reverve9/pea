import AdminHeader from '@/components/admin/AdminHeader'
import { getAllNotices, getAllFaqs, getSiteContentAdmin } from '@/lib/adminQueries'
import BoardTabs from './BoardTabs'
import { PRIVACY_KEY } from './policyActions'

// 매 요청 최신 데이터(service_role 조회) — 캐시하지 않음.
export const dynamic = 'force-dynamic'

// 공지사항 + FAQ + 개인정보처리방침 결합 페이지(탭). 각 탭은 기존 클라이언트 재사용.
export default async function AdminBoardPage() {
  const [notices, faqs, privacy] = await Promise.all([
    getAllNotices(),
    getAllFaqs(),
    getSiteContentAdmin(PRIVACY_KEY),
  ])
  return (
    <>
      <AdminHeader title="공지·FAQ" desc="공지사항 · 자주 묻는 질문 · 개인정보처리방침 관리" />
      <BoardTabs notices={notices} faqs={faqs} privacyBody={privacy?.body ?? ''} />
    </>
  )
}
