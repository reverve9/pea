'use client'

import { useState } from 'react'
import AdminTabs, { type AdminTab } from '@/components/admin/AdminTabs'
import type { NoticeAdmin, FaqAdmin } from '@/lib/types'
import NoticesClient from '../notices/NoticesClient'
import FaqsClient from '../faqs/FaqsClient'

type Tab = 'notices' | 'faqs'

export default function BoardTabs({ notices, faqs }: { notices: NoticeAdmin[]; faqs: FaqAdmin[] }) {
  const [tab, setTab] = useState<Tab>('notices')

  const tabs: AdminTab<Tab>[] = [
    { key: 'notices', label: '공지사항', count: notices.length },
    { key: 'faqs', label: 'FAQ', count: faqs.length },
  ]

  return (
    <>
      <AdminTabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" />
      {tab === 'notices' ? <NoticesClient notices={notices} /> : <FaqsClient faqs={faqs} />}
    </>
  )
}
