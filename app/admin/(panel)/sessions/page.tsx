import AdminHeader from '@/components/admin/AdminHeader'
import { getAllSessions, getSelectableCourses } from '@/lib/adminQueries'
import SessionsClient from './SessionsClient'

// 매 요청 최신 데이터(service_role 조회 + 신청현황 집계) — 캐시하지 않음.
export const dynamic = 'force-dynamic'

export default async function AdminSessionsPage() {
  const [sessions, courses] = await Promise.all([getAllSessions(), getSelectableCourses()])
  return (
    <>
      <AdminHeader title="연수 차수" desc="차수 개설·수정 · 정원/신청현황" />
      <SessionsClient sessions={sessions} courses={courses} />
    </>
  )
}
