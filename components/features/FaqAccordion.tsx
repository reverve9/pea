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
    <div className="space-y-1.5">
      {faqs.map((f) => {
        const open = openId === f.id
        return (
          <div
            key={f.id}
            className="overflow-hidden rounded-[10px] border border-[#e5eaef] bg-[#f2f5f9] transition-colors hover:bg-[#eaeff5]"
          >
            <button
              type="button"
              onClick={() => setOpenId(open ? null : f.id)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
              aria-expanded={open}
            >
              <span className="font-score text-[13.5px] font-[500] leading-snug text-[#1e3a5f]">{f.question}</span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-[#9ca3af] transition-transform ${open ? 'rotate-180' : ''}`}
              />
            </button>
            {open && (
              <div className="border-t border-[#e5eaef] bg-white px-3.5 pb-3 pt-2.5">
                <p className="whitespace-pre-wrap text-[13px] font-[300] leading-relaxed text-[#4b5563]">
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
