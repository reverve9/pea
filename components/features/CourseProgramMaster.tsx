'use client'

import { ChevronDown } from 'lucide-react'
import Text from '@/components/common/Text'
import { PROGRAMS } from '@/lib/programs'
import { PendingPanel } from './ProgramTabs'
import { COURSE_TYPE_META, CourseTypeMetaCard, scheduleSummary } from './CourseTypes'
import type { SessionWithCourse } from '@/lib/types'

// /courses 데스크탑 좌측 단일 마스터 — 프로그램(종목) 아코디언 → 유형 카드(CourseTypeMetaCard 공용).
// 신청 마스터처럼 4프로그램(스키 개설 + 준비중 3), 한 번에 하나만 열림(기본 스키). 유형 카드 클릭 → 우측 유형 상세.
// 유형 카드 = 해설 + 기간·학점·일정·비용 메타 그리드(모바일과 동일 스타일). 차수 전체 브라우징은 우측 캘린더.
export default function CourseProgramMaster({
  sessions, program, onProgram, selectedType, onSelectType,
}: {
  sessions: SessionWithCourse[]
  program: string
  onProgram: (k: string) => void
  selectedType: string | null
  onSelectType: (k: string) => void
}) {
  return (
    <div className="space-y-2">
      {PROGRAMS.map((p) => {
        const open = p.key === program
        const progSessions = sessions.filter((s) => s.course?.sport === p.sport)
        return (
          <div key={p.key} className="overflow-hidden rounded-[10px] border border-[#e5eaef] bg-[#f2f5f9]">
            {/* 프로그램(종목) 아코디언 헤더 — 한 번에 하나만 열림. */}
            <button
              type="button"
              onClick={() => onProgram(p.key)}
              aria-expanded={open}
              className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
              style={{ background: open ? '#eef2f6' : undefined }}
            >
              <Text variant="card-title" as="span" className="min-w-0 flex-1">{p.title}</Text>
              {!p.ready && <Text variant="caption" as="span" className="shrink-0 text-[#9ca3af]">준비중</Text>}
              <ChevronDown size={18} className="shrink-0 transition-transform" style={{ transform: open ? 'rotate(180deg)' : undefined, color: open ? '#4b5563' : '#9ca3af' }} />
            </button>
            {open && (
              <div className="space-y-2 border-t border-[#e5eaef] bg-white p-2">
                {p.ready ? (
                  COURSE_TYPE_META.map((meta) => (
                    <CourseTypeMetaCard
                      key={meta.key}
                      meta={meta}
                      square
                      scheduleText={scheduleSummary(progSessions, meta.key)}
                      selected={selectedType === meta.key}
                      onClick={() => onSelectType(meta.key)}
                    />
                  ))
                ) : (
                  <PendingPanel title={p.title} />
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
