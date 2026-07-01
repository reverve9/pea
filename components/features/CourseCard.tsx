'use client'

import React from 'react'
import { Badge } from '@/components/common/Badge'
import { COURSE_STATUS } from '@/lib/display'
import type { Course } from '@/lib/types'

// 주요 프로그램 카드(§3-1). 종목/과정명 + 상태 배지 + 설명. 읽기 전용.
// 스타일 토큰(white-box, fluid-*)만 사용 — raw 하드코딩 없음(원칙1).
export default function CourseCard({ course }: { course: Course }) {
  const status = COURSE_STATUS[course.status]
  return (
    <div className="white-box p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {course.sport && (
            <p className="fluid-nav-label font-[300] text-[#8a94a0] mb-1">{course.sport}</p>
          )}
          <h3 className="fluid-body font-[500] text-[#1f2937] leading-snug">{course.name}</h3>
        </div>
        <Badge color={status.color} size="sm" className="shrink-0 mt-0.5">
          {status.label}
        </Badge>
      </div>
      {course.description && (
        <p className="fluid-body text-[#6b7280] mt-2 leading-relaxed">{course.description}</p>
      )}
    </div>
  )
}
