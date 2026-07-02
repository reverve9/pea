'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import PageTitle from '@/components/common/PageTitle'
import { TabButton } from '@/components/common/Button'
import { LoadingState, EmptyState } from '@/components/common/StateView'
import NoticeCard from '@/components/features/NoticeCard'
import FaqAccordion from '@/components/features/FaqAccordion'
import InquiryBoardShell from '@/components/features/InquiryBoardShell'
import { useQuery } from '@/lib/useQuery'
import { getNotices, getFaqs } from '@/lib/queries'
import type { Notice, Faq } from '@/lib/types'

// §3-5 커뮤니티 리스트(PWA 페인). Phase 2.6: 공지 상세는 URL 라우트(/community/notices/[id])로 이관 —
// 카드 클릭 = Link, 선택 하이라이트 = usePathname(URL 이 선택 상태의 SSOT). 상세 렌더는 @detail 슬롯 담당.
// FAQ(아코디언)·문의 2종(셸)은 리스트 페인 안에서 그대로. AppShell 은 community/layout 이 감싼다.
type Tab = 'notices' | 'faq' | 'general' | 'cert'

const TABS: { key: Tab; label: string }[] = [
  { key: 'notices', label: '공지사항' },
  { key: 'faq', label: 'FAQ' },
  { key: 'general', label: '일반문의' },
  { key: 'cert', label: '증명문의' },
]

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>('notices')
  const pathname = usePathname()
  const notices = useQuery<Notice[]>(getNotices, [])
  const faqs = useQuery<Faq[]>(getFaqs, [])

  return (
    <div className="pb-8">
      <PageTitle title="커뮤니티" en="COMMUNITY" />

      <div className="flex flex-wrap gap-2 px-4 pb-3">
        {TABS.map((t) => (
          <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
            {t.label}
          </TabButton>
        ))}
      </div>

      {tab === 'notices' &&
        (notices.loading ? (
          <LoadingState />
        ) : notices.data.length === 0 ? (
          <EmptyState label="등록된 공지가 없습니다." />
        ) : (
          <div className="space-y-3 px-4">
            {notices.data.map((n) => {
              const href = `/community/notices/${n.id}`
              const selected = pathname === href
              return (
                <Link
                  key={n.id}
                  href={href}
                  scroll={false}
                  aria-current={selected ? 'page' : undefined}
                  className="block"
                >
                  <NoticeCard notice={n} selected={selected} />
                </Link>
              )
            })}
          </div>
        ))}

      {tab === 'faq' && (
        <div className="px-4">{faqs.loading ? <LoadingState /> : <FaqAccordion faqs={faqs.data} />}</div>
      )}

      {tab === 'general' && (
        <div className="px-4">
          <InquiryBoardShell kind="general" />
        </div>
      )}

      {tab === 'cert' && (
        <div className="px-4">
          <InquiryBoardShell kind="cert" />
        </div>
      )}
    </div>
  )
}
