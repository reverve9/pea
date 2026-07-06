'use client'

import Text from '@/components/common/Text'
import { PROGRAMS } from '@/lib/programs'

// 프로그램(종목) 층 공용 — 신청·연수안내 동일. 4종 탭(스키 개설 + 준비중 3), 4종 모두 클릭 가능.
// 준비중 프로그램 선택 시 각 페이지가 PendingPanel 렌더. [[pea-taxonomy-program-vs-course]]
const NAVY = '#1e3a5f'

// 프로그램 탭 — 4열 그리드, 선택 시 네이비 솔리드.
export function ProgramTabs({ active, onSelect }: { active: string; onSelect: (k: string) => void }) {
  return (
    <div className="mb-5 grid grid-cols-4 gap-2">
      {PROGRAMS.map((p) => {
        const on = p.key === active
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onSelect(p.key)}
            aria-pressed={on}
            className="rounded-[5px] border px-2 py-2.5 text-center font-score text-[clamp(0.6875rem,2.6cqi,0.8125rem)] font-[500] transition-colors"
            style={{
              borderColor: on ? NAVY : '#e5eaef',
              background: on ? NAVY : '#f2f5f9',
              color: on ? '#ffffff' : '#8a94a0',
            }}
          >
            {p.title}
          </button>
        )
      })}
    </div>
  )
}

// 준비중 프로그램 패널 — 상세/모달 자리 공용.
export function PendingPanel({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center rounded-[10px] border border-[#e5eaef] py-10" style={{ background: '#f2f5f9' }}>
      <Text variant="sub" color="#9ca3af">{title} 연수는 준비 중입니다.</Text>
    </div>
  )
}
