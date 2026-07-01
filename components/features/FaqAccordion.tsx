'use client'

import React, { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { EmptyState } from '@/components/common/StateView'
import type { Faq } from '@/lib/types'

// FAQ 아코디언(§3-5). question 클릭 → content 펼침. 읽기 전용.
export default function FaqAccordion({ faqs }: { faqs: Faq[] }) {
  const [openId, setOpenId] = useState<string | null>(null)

  if (faqs.length === 0) {
    return <EmptyState label="등록된 FAQ가 없습니다." />
  }

  return (
    <div className="space-y-2">
      {faqs.map((f) => {
        const open = openId === f.id
        return (
          <div key={f.id} className="white-box p-0 overflow-hidden">
            <button
              type="button"
              onClick={() => setOpenId(open ? null : f.id)}
              className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              aria-expanded={open}
            >
              <span className="fluid-body font-[500] text-[#1f2937] leading-snug">{f.question}</span>
              <ChevronDown
                size={18}
                className={`shrink-0 text-[#9ca3af] transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
            {open && (
              <div className="px-4 pb-4 pt-1 border-t border-[#f0f1f3]">
                <p className="fluid-body text-[#4b5563] leading-relaxed whitespace-pre-wrap">
                  {f.content}
                </p>
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
