'use client'

import React from 'react'
import { Pin } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { NOTICE_CATEGORY, formatDate } from '@/lib/display'
import type { Notice } from '@/lib/types'

// 공지 리스트 카드(§3-5). master-detail List 의 renderCard 로 사용. 선택 시 링 강조.
export default function NoticeCard({ notice, selected }: { notice: Notice; selected: boolean }) {
  const cat = NOTICE_CATEGORY[notice.category]
  const date = formatDate((notice.published_at ?? notice.created_at).slice(0, 10))
  return (
    <div className={`white-box p-3 transition-shadow ${selected ? 'ring-2 ring-[#5b7cae]' : ''}`}>
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <div className="flex items-center gap-1.5">
          {notice.is_pinned && (
            <Pin size={13} className="text-[#b87a5a]" fill="currentColor" />
          )}
          <Badge color={cat.color} size="sm">
            {cat.label}
          </Badge>
        </div>
        <span className="fluid-nav-label text-[#9ca3af] tabular-nums">{date}</span>
      </div>
      <h3 className="fluid-body font-[500] text-[#1f2937] leading-snug line-clamp-2">{notice.title}</h3>
    </div>
  )
}
