'use client'

import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import SectionTitle from '@/components/common/SectionTitle'
import ExtendedHeader from '@/components/layout/ExtendedHeader'
import { PLACEHOLDER_SNS } from '@/lib/siteMeta'
import { LoadingState } from '@/components/common/StateView'
import ScheduleCalendar from '@/components/features/ScheduleCalendar'
import CourseOverview from '@/components/features/CourseOverview'
import CourseTypes from '@/components/features/CourseTypes'
import { useQuery } from '@/lib/useQuery'
import { getSessions } from '@/lib/queries'
import type { SessionWithCourse } from '@/lib/types'

// §3-2 연수안내: 개요 + 연수일정 달력(sessions) + 유형(직무/자율 3종, 아코디언). 읽기 전용.
// extended(780)는 데스크탑 전용 → 개요·유형은 모바일(main·md:hidden)/데스크탑(extended)로 나눠 배치.
export default function CoursesPage() {
  const sessions = useQuery<SessionWithCourse[]>(getSessions, [])

  return (
    <AppShell
      main={
        <div className="pb-8">
          <PageTitle title="연수안내" en="COURSES" />
          {/* 도입 리드 — 홈 슬로건/소개 레지스터(경량 font-300 + 넉넉한 행간 + 키워드만 강조). "볼드≠강조". */}
          <p className="px-4 pt-1 pb-8 font-score text-center text-[clamp(0.9375rem,3.9vw,1.0625rem)] font-[300] leading-[1.85] text-[#4b5563]">
            개설된 연수의 <span className="font-[500] text-[#1e3a5f]">일정과 유형</span>을 한눈에 안내합니다.<br />
            신청 전 회차와 유형을 확인하세요.
          </p>

          {/* 연수 개요 — 모바일 전용(데스크탑은 우측 extended 페인에 표시) */}
          <section className="px-4 mb-10 md:hidden">
            <CourseOverview />
          </section>

          {/* 연수일정 달력 */}
          <section className="px-4 mb-8">
            <SectionTitle title="일정" en="Schedule" />
            {sessions.loading ? <LoadingState /> : <ScheduleCalendar sessions={sessions.data} />}
          </section>

          {/* 유형 — 모바일 전용(데스크탑은 우측 페인에서 노출) */}
          <section className="px-4 md:hidden">
            <SectionTitle title="유형" en="Types" />
            <CourseTypes />
          </section>
        </div>
      }
      extended={
        <div>
          <ExtendedHeader title="연수안내" eyebrow="COURSES" sns={PLACEHOLDER_SNS} />
          {/* 연수 개요 — 데스크탑 우측 페인(모바일은 좌측 main에 표시) */}
          <div className="mb-10">
            <CourseOverview />
          </div>
          {/* 유형 — 데스크탑 우측 페인(모바일은 좌측 일정 하단) */}
          <SectionTitle title="유형" en="Types" />
          <CourseTypes />
        </div>
      }
    />
  )
}
