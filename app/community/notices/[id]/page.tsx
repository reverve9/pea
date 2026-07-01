import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowLeft } from 'lucide-react'
import NoticeDetail from '@/components/features/NoticeDetail'
import { getNoticeById } from '@/lib/queries.server'

// Full page Route: 직접 URL 진입·새로고침·공유·SEO 색인용 (서버 컴포넌트 실제 fetch).
// community/layout 을 거쳐 AppShell main(PWA 페인)에 풀페이지로 렌더된다.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>
}): Promise<Metadata> {
  const { id } = await params
  const notice = await getNoticeById(id)
  return { title: notice ? `${notice.title} · 공지사항 | 체육교육회` : '공지사항 | 체육교육회' }
}

export default async function NoticeFullPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const notice = await getNoticeById(id)
  if (!notice) notFound()

  return (
    <div className="pb-8">
      <div className="px-4 pt-4">
        <Link
          href="/community"
          className="inline-flex items-center gap-1 fluid-nav-label font-[500] text-[#3f6a99] hover:underline"
        >
          <ArrowLeft size={15} />
          목록으로
        </Link>
      </div>
      <div className="mt-3 px-4">
        <NoticeDetail notice={notice} />
      </div>
    </div>
  )
}
