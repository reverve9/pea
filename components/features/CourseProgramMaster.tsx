'use client'

import SectionTitle from '@/components/common/SectionTitle'
import { OPEN_PROGRAMS } from '@/lib/programs'
import { COURSE_TYPE_META, CourseTypeMetaCard, scheduleSummary } from './CourseTypes'
import type { SessionWithCourse } from '@/lib/types'

// /courses 데스크탑 좌측 단일 마스터 — 개설 종목별 섹션(SectionTitle) + 유형 카드(CourseTypeMetaCard) 평면 스택.
// 신청 좌측(SectionTitle + TrackCard)과 동일 구조로 통일 — 프로그램 아코디언 제거(개설 종목 1개라 펼침/접힘 무의미).
// 프로그램 선택(층1)은 사라지고, 유형 카드 클릭 → 우측 유형 상세 아코디언(type-level 마스터-디테일)만 유지. [[left-card-mastercard]]
export default function CourseProgramMaster({
  sessions, selectedType, onSelectType,
}: {
  sessions: SessionWithCourse[]
  selectedType: string | null
  onSelectType: (k: string) => void
}) {
  return (
    <div>
      {OPEN_PROGRAMS.map((p) => {
        const progSessions = sessions.filter((s) => s.course?.sport === p.sport)
        return (
          <div key={p.key} className="mb-8">
            <SectionTitle title={p.title} en={p.en} rail />
            <div className="space-y-6">
              {COURSE_TYPE_META.map((meta) => (
                <CourseTypeMetaCard
                  key={meta.key}
                  meta={meta}
                  scheduleText={scheduleSummary(progSessions, meta.key)}
                  selected={selectedType === meta.key}
                  onClick={() => onSelectType(meta.key)}
                />
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
