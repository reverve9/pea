'use client'

import { useState } from 'react'
import AdminTabs, { type AdminTab } from '@/components/admin/AdminTabs'
import type { NoticeAdmin } from '@/lib/types'
import NoticesClient from '../notices/NoticesClient'
import PolicyClient from './PolicyClient'

// 게시 콘텐츠 묶음 — 공지 / 개인정보처리방침. 방침은 문서 한 장이라 메뉴를 따로 파지 않고 탭으로.
// FAQ 는 코드(lib/faqs.ts)로 이전해 어드민 편집 탭 없음(2026-10-09).
type Tab = 'notices' | 'privacy'

export default function BoardTabs({
  notices,
  privacyBody,
}: {
  notices: NoticeAdmin[]
  privacyBody: string
}) {
  const [tab, setTab] = useState<Tab>('notices')

  const tabs: AdminTab<Tab>[] = [
    { key: 'notices', label: '공지사항', count: notices.length },
    { key: 'privacy', label: '개인정보처리방침' },
  ]

  return (
    <>
      <AdminTabs tabs={tabs} value={tab} onChange={setTab} className="mb-4" />
      {tab === 'notices' && <NoticesClient notices={notices} />}
      {tab === 'privacy' && <PolicyClient body={privacyBody} />}
    </>
  )
}
