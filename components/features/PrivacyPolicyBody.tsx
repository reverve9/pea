'use client'

import { useState } from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import Text from '@/components/common/Text'
import MarkdownRenderer from '@/components/common/MarkdownRenderer'
import { EmptyState, LoadingState } from '@/components/common/StateView'
import { useQuery } from '@/lib/useQuery'
import { getSiteContent } from '@/lib/queries'
import type { SiteContent } from '@/lib/types'

// 개인정보처리방침 — site_contents(privacy_policy) 마크다운을 조항(## 제N조) 단위로 나눠 보여준다.
// 전문을 한 번에 길게 늘어놓지 않는다: 데스크탑 = 좌 목차 → 우 확장 페인에 선택 조항만,
// 모바일 = 조항 아코디언(푸터 링크 → 공용 Modal / 직접 진입 시 좌 페인). 새 창 사용 안 함.

export interface PolicySection {
  title: string
  body: string
}

// '## ' 제목 기준 분할. 첫 제목 앞의 서문은 '개요' 조항으로.
export function splitPolicy(md: string): PolicySection[] {
  const sections: PolicySection[] = []
  let cur: PolicySection = { title: '개요', body: '' }
  for (const line of md.split('\n')) {
    if (line.startsWith('## ')) {
      if (cur.body.trim()) sections.push({ ...cur, body: cur.body.trim() })
      cur = { title: line.slice(3).trim(), body: '' }
    } else {
      cur.body += line + '\n'
    }
  }
  if (cur.body.trim()) sections.push({ ...cur, body: cur.body.trim() })
  return sections
}

export function usePrivacyPolicy() {
  const q = useQuery<SiteContent | null>(() => getSiteContent('privacy_policy'), null)
  return { loading: q.loading, sections: splitPolicy(q.data?.body?.trim() ?? '') }
}

// 모바일 — 조항 아코디언(FAQ 아코디언과 동일 어법). 한 번에 하나만 펼침.
export function PolicyAccordion({ loading, sections }: { loading: boolean; sections: PolicySection[] }) {
  const [open, setOpen] = useState<number | null>(null)
  if (loading) return <LoadingState />
  if (sections.length === 0) return <EmptyState label="개인정보처리방침이 곧 등록됩니다." />
  return (
    <div className="space-y-1.5">
      {sections.map((s, i) => {
        const isOpen = open === i
        return (
          <div key={s.title} className="overflow-hidden rounded-[10px] border border-[#e5eaef] bg-[#f2f5f9] transition-colors hover:bg-[#eaeff5]">
            <button
              type="button"
              onClick={() => setOpen(isOpen ? null : i)}
              className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
              aria-expanded={isOpen}
            >
              <Text variant="card-title-sm">{s.title}</Text>
              <ChevronDown size={16} className={`shrink-0 text-[#9ca3af] transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>
            {isOpen && (
              <div className="border-t border-[#e5eaef] bg-white px-3.5 pb-1 pt-2.5">
                <MarkdownRenderer content={s.body} />
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

// 데스크탑 좌 페인 — 조항 목차.
export function PolicyIndex({ sections, selected, onSelect }: { sections: PolicySection[]; selected: number; onSelect: (i: number) => void }) {
  return (
    <nav className="space-y-1">
      {sections.map((s, i) => {
        const active = i === selected
        return (
          <button
            key={s.title}
            type="button"
            onClick={() => onSelect(i)}
            className={`flex w-full items-center justify-between gap-2 rounded-[10px] px-3.5 py-2.5 text-left transition-colors ${
              active ? 'bg-[#e9eef4]' : 'hover:bg-[#f2f5f9]'
            }`}
            aria-current={active ? 'true' : undefined}
          >
            <Text variant="sub" className={active ? 'font-[500] text-[#1e3a5f]' : 'text-[#4b5563]'}>{s.title}</Text>
            <ChevronRight size={15} className={`shrink-0 ${active ? 'text-[#1e3a5f]' : 'text-[#c0c6cd]'}`} />
          </button>
        )
      })}
    </nav>
  )
}

// 데스크탑 우 확장 페인 — 선택 조항 본문 + 이전/다음.
export function PolicyArticle({ loading, sections, selected, onSelect }: { loading: boolean; sections: PolicySection[]; selected: number; onSelect: (i: number) => void }) {
  if (loading) return <LoadingState />
  const s = sections[selected]
  if (!s) return <EmptyState label="개인정보처리방침이 곧 등록됩니다." />
  const prev = sections[selected - 1]
  const next = sections[selected + 1]
  return (
    <article>
      <Text as="h2" variant="card-title" className="mb-4 text-[#1e3a5f]">{s.title}</Text>
      <MarkdownRenderer content={s.body} />
      <div className="mt-8 flex items-center justify-between gap-3 border-t border-[#eceef1] pt-4">
        {prev ? (
          <button type="button" onClick={() => onSelect(selected - 1)} className="flex items-center gap-1 text-[13px] text-[#4b5563] hover:text-[#1e3a5f]">
            <ChevronLeft size={15} /> {prev.title}
          </button>
        ) : <span />}
        {next ? (
          <button type="button" onClick={() => onSelect(selected + 1)} className="flex items-center gap-1 text-[13px] text-[#4b5563] hover:text-[#1e3a5f]">
            {next.title} <ChevronRight size={15} />
          </button>
        ) : <span />}
      </div>
    </article>
  )
}

// 자체 조회형 아코디언 — 모바일 푸터 모달용.
export default function PrivacyPolicyBody() {
  const policy = usePrivacyPolicy()
  return <PolicyAccordion loading={policy.loading} sections={policy.sections} />
}
