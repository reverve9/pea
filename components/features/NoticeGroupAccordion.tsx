'use client'

import React, { useState, useEffect } from 'react'
import { Pin, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import Text from '@/components/common/Text'
import MarkdownRenderer from '@/components/common/MarkdownRenderer'
import { NOTICE_CATEGORY, formatDate } from '@/lib/display'
import type { Notice } from '@/lib/types'

// 우측 공지 — 카테고리 그룹핑 없이 '다 묶은' 평면 아코디언. 카테고리는 제목 앞 배지로 표시.
// 페이지 슬라이스(pagedNotices)를 받아 표시하고, 페이지네이션은 상위(섹션타이틀 우측)에서.
interface Props {
  notices: Notice[]
  selectedNoticeId?: string | null
}

function pinnedFirst(a: Notice, b: Notice) {
  if (a.is_pinned && !b.is_pinned) return -1
  if (!a.is_pinned && b.is_pinned) return 1
  const ad = (a.published_at ?? a.created_at) ?? ''
  const bd = (b.published_at ?? b.created_at) ?? ''
  return bd.localeCompare(ad)
}

export default function NoticeGroupAccordion({ notices, selectedNoticeId }: Props) {
  // 싱글 오픈 — 하나만 펼침(클릭 시 나머진 닫힘). 마스터-디테일 반응을 또렷하게.
  const [openId, setOpenId] = useState<string | null>(null)
  const [initialExpanded, setInitialExpanded] = useState(false)

  // 최초 로드: 첫 글 펼침.
  useEffect(() => {
    if (!initialExpanded && notices.length > 0 && !selectedNoticeId) {
      setOpenId([...notices].sort(pinnedFirst)[0].id)
      setInitialExpanded(true)
    }
  }, [notices, initialExpanded, selectedNoticeId])

  // 좌측에서 공지 선택 → 그 글만 펼침 + 스크롤(가운데).
  useEffect(() => {
    if (!selectedNoticeId) return
    setOpenId(selectedNoticeId)
    const t = setTimeout(() => {
      document
        .getElementById(`notice-${selectedNoticeId}`)
        ?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 100)
    return () => clearTimeout(t)
  }, [selectedNoticeId])

  if (notices.length === 0) {
    return <Text as="p" variant="sub" color="#9ca3af" className="py-12 text-center">등록된 공지가 없습니다.</Text>
  }

  const sorted = [...notices].sort(pinnedFirst)

  return (
    <div className="overflow-hidden rounded-[10px] border border-[#e5eaef] bg-[#f2f5f9]">
      {sorted.map((notice) => {
        const open = openId === notice.id
        const cat = NOTICE_CATEGORY[notice.category]
        const date = formatDate((notice.published_at ?? notice.created_at).slice(0, 10))
        return (
          <div
            key={notice.id}
            id={`notice-${notice.id}`}
            className={[
              'scroll-mt-2 border-t border-l-[3px] border-t-[#e5eaef] transition-colors first:border-t-0',
              open ? 'border-l-[#1e3a5f] bg-[#e7eef6]' : 'border-l-transparent',
            ].join(' ')}
          >
            <div
              onClick={() => setOpenId(open ? null : notice.id)}
              className={[
                'flex cursor-pointer items-center gap-2.5 px-3.5 py-3 text-left transition-colors',
                open ? '' : 'hover:bg-white/50',
              ].join(' ')}
            >
              <ChevronDown
                size={17}
                className={`shrink-0 transition-transform ${open ? 'rotate-180 text-[#1e3a5f]' : 'text-[#9ca3af]'}`}
              />
              {notice.is_pinned && <Pin size={13} className="shrink-0 text-[#a65546]" fill="currentColor" />}
              <Badge color={cat.color} size="sm" className="shrink-0">
                {cat.label}
              </Badge>
              <Text variant="card-title-sm" className="min-w-0 flex-1 truncate">
                {notice.title}
              </Text>
              <Text variant="date" className="shrink-0">{date}</Text>
            </div>

            {open && (
              <div className="border-t border-[#e5eaef] bg-white px-4 py-4 text-[clamp(0.6875rem,2.6cqi,0.8125rem)]">
                <MarkdownRenderer content={notice.content} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
