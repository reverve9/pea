import AdminHeader from '@/components/admin/AdminHeader'
import { getAllNotices, getSiteContentAdmin } from '@/lib/adminQueries'
import BoardTabs from './BoardTabs'
import { PRIVACY_KEY } from './policyKeys'

// 매 요청 최신 데이터(service_role 조회) — 캐시하지 않음.
export const dynamic = 'force-dynamic'

// 공지사항 + 개인정보처리방침 결합 페이지(탭). FAQ 는 코드(lib/faqs.ts). 각 탭은 기존 클라이언트 재사용.
export default async function AdminBoardPage() {
  const [notices, privacy] = await Promise.all([
    getAllNotices(),
    getSiteContentAdmin(PRIVACY_KEY),
  ])
  return (
    <>
      <AdminHeader title="공지사항" desc="공지사항 · 개인정보처리방침 관리" />
      <BoardTabs notices={notices} privacyBody={privacy?.body ?? ''} />
    </>
  )
}
