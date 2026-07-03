import AdminHeader from '@/components/admin/AdminHeader'
import { getAllNotices } from '@/lib/adminQueries'
import NoticesClient from './NoticesClient'

// 매 요청 최신 데이터(service_role 조회) — 캐시하지 않음.
export const dynamic = 'force-dynamic'

export default async function AdminNoticesPage() {
  const notices = await getAllNotices()
  return (
    <>
      <AdminHeader title="공지사항" desc="공지 작성·발행·수정" />
      <NoticesClient notices={notices} />
    </>
  )
}
