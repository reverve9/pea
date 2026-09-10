'use client'

import { useState } from 'react'
import AdminTabs, { type AdminTab } from '@/components/admin/AdminTabs'
import type { NoticeAdmin, FaqAdmin } from '@/lib/types'
import NoticesClient from '../notices/NoticesClient'
import FaqsClient from '../faqs/FaqsClient'
import PolicyClient from './PolicyClient'

// 게시 콘텐츠 묶음 — 공지 / FAQ / 개인정보처리방침. 방침은 문서 한 장이라 메뉴를 따로 파지 않고 탭으로.
type Tab = 'notices' | 'faqs' | 'privacy'

export default function BoardTabs({
  notices,
  faqs,
  privacyBody,
}: {
  notices: NoticeAdmin[]
  faqs: FaqAdmin[]
  privacyBody: string
}) {
  const [tab, setTab] = useState<Tab>('notices')

  const tabs: AdminTab<Tab>[] = [
    { key: 'notices', label: '공지사항', count: notices.length },
    { key: 'faqs', label: 'FAQ', count: faqs.length },
    { key: 'privacy', label: '개인정보처리방침' },
  ]

  return (
    <>
      <AdminTabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" />
      {tab === 'notices' && <NoticesClient notices={notices} />}
      {tab === 'faqs' && <FaqsClient faqs={faqs} />}
      {tab === 'privacy' && <PolicyClient body={privacyBody} />}
    </>
  )
}
