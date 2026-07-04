'use client'

import React from 'react'
import { Pin } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import Text from '@/components/common/Text'
import MarkdownRenderer from '@/components/common/MarkdownRenderer'
import { NOTICE_CATEGORY, formatDate } from '@/lib/display'
import type { Notice } from '@/lib/types'

// 공지 상세(§3-5). master-detail Detail 의 renderDetail 로 사용(데스크탑 인라인 / 모바일 모달).
export default function NoticeDetail({ notice }: { notice: Notice }) {
  const cat = NOTICE_CATEGORY[notice.category]
  const date = formatDate((notice.published_at ?? notice.created_at).slice(0, 10))
  return (
    <article>
      <div className="flex items-center gap-2 mb-2">
        {notice.is_pinned && <Pin size={14} className="text-[#a65546]" fill="currentColor" />}
        <Badge color={cat.color} size="sm">
          {cat.label}
        </Badge>
        <Text variant="date">{date}</Text>
      </div>
      <Text as="h2" variant="card-title-sm" className="mb-4">{notice.title}</Text>
      <div className="border-t border-[#f0f1f3] pt-4">
        <MarkdownRenderer content={notice.content} />
      </div>
    </article>
  )
}
