'use client'

import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import { TabButton } from '@/components/common/Button'
import { LoadingState, EmptyState } from '@/components/common/StateView'
import {
  MasterDetailProvider,
  MasterDetailList,
  MasterDetailDetail,
} from '@/components/shell/MasterDetail'
import NoticeCard from '@/components/features/NoticeCard'
import NoticeDetail from '@/components/features/NoticeDetail'
import FaqAccordion from '@/components/features/FaqAccordion'
import InquiryBoardShell from '@/components/features/InquiryBoardShell'
import { useQuery } from '@/lib/useQuery'
import { getNotices, getFaqs } from '@/lib/queries'
import type { Notice, Faq } from '@/lib/types'

// §3-5 커뮤니티: 공지(master-detail 실데이터) · FAQ(아코디언 실데이터) · 문의 2종(셸만).
// 4개 서브보드는 탭으로 전환. 공지 탭만 master-detail 사용(리스트=main / 상세=extended·모바일모달).
type Tab = 'notices' | 'faq' | 'general' | 'cert'

const TABS: { key: Tab; label: string }[] = [
  { key: 'notices', label: '공지사항' },
  { key: 'faq', label: 'FAQ' },
  { key: 'general', label: '일반문의' },
  { key: 'cert', label: '증명문의' },
]

export default function CommunityPage() {
  const [tab, setTab] = useState<Tab>('notices')
  const notices = useQuery<Notice[]>(getNotices, [])
  const faqs = useQuery<Faq[]>(getFaqs, [])

  const tabBar = (
    <div className="flex flex-wrap gap-2 px-4 pb-3">
      {TABS.map((t) => (
        <TabButton key={t.key} active={tab === t.key} onClick={() => setTab(t.key)}>
          {t.label}
        </TabButton>
      ))}
    </div>
  )

  // main(좌측/모바일) 콘텐츠 — 탭별
  const main = (
    <div className="pb-8">
      <PageTitle title="COMMUNITY" subtitle="커뮤니티" />
      {tabBar}

      {tab === 'notices' &&
        (notices.loading ? (
          <LoadingState />
        ) : (
          <>
            <MasterDetailList<Notice>
              items={notices.data}
              getKey={(n) => n.id}
              renderCard={(n, { selected }) => <NoticeCard notice={n} selected={selected} />}
              emptyLabel="등록된 공지가 없습니다."
            />
            {/* 모바일 상세 모달(데스크탑은 우측 페인) */}
            <MasterDetailDetail<Notice>
              variant="mobile"
              items={notices.data}
              getKey={(n) => n.id}
              renderDetail={(n) => <NoticeDetail notice={n} />}
            />
          </>
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

  // extended(데스크탑 780) — 공지 탭은 상세, 그 외는 보조 안내
  const extended =
    tab === 'notices' ? (
      <MasterDetailDetail<Notice>
        variant="desktop"
        items={notices.data}
        getKey={(n) => n.id}
        renderDetail={(n) => <NoticeDetail notice={n} />}
        placeholder={
          <div className="flex items-center justify-center min-h-[300px]">
            <EmptyState label="좌측에서 공지를 선택하세요." />
          </div>
        }
      />
    ) : tab === 'faq' ? (
      <div className="flex items-center justify-center min-h-[300px]">
        <EmptyState label="자주 묻는 질문을 확인해 보세요." />
      </div>
    ) : (
      <div className="flex items-center justify-center min-h-[300px]">
        <EmptyState label="본인확인 후 문의 내역을 확인할 수 있습니다." />
      </div>
    )

  return (
    <MasterDetailProvider>
      <AppShell main={main} extended={extended} />
    </MasterDetailProvider>
  )
}
