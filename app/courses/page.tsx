'use client'

import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import SectionTitle from '@/components/common/SectionTitle'
import ExtendedHeader from '@/components/layout/ExtendedHeader'
import { PLACEHOLDER_SNS } from '@/lib/siteMeta'
import { LoadingState } from '@/components/common/StateView'
import ScheduleCalendar from '@/components/features/ScheduleCalendar'
import CourseOverview from '@/components/features/CourseOverview'
import {
  CourseTypesMobile,
  CourseTypeCards,
  CourseTypeAccordion,
  DEFAULT_TYPE_KEY,
} from '@/components/features/CourseTypes'
import { useQuery } from '@/lib/useQuery'
import { getSessions } from '@/lib/queries'
import type { SessionWithCourse } from '@/lib/types'

// §3-2 연수안내 — 데스크탑 셸: 좌 500 = 사이드바(도입·일정·유형 요약 마스터) / 우 780 = 메인(개요·유형 상세).
// 유형: 좌 요약카드(마스터) → 우 아코디언(디테일, 선택 시 최상단 스크롤). 상태는 페이지에서 공유.
// ⚠ 일정은 아직 좌측 캘린더 그대로(다음 단계에서 캘린더 우측 이동 + 좌 월별요약 마스터로 재배치 예정).
export default function CoursesPage() {
  const sessions = useQuery<SessionWithCourse[]>(getSessions, [])
  const [selectedType, setSelectedType] = useState(DEFAULT_TYPE_KEY)

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

          {/* 유형 — 모바일: 카드 → 중앙 팝업 모달(건드리지 않음) */}
          <section className="px-4 md:hidden">
            <SectionTitle title="유형" en="Types" />
            <CourseTypesMobile />
          </section>

          {/* 유형 — 데스크탑 좌측 마스터(요약 카드). 우측 아코디언을 제어. */}
          <section className="px-4 hidden md:block">
            <SectionTitle title="유형" en="Types" />
            <CourseTypeCards selected={selectedType} onSelect={setSelectedType} />
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
          {/* 유형 상세 — 데스크탑 우측 아코디언(좌 카드가 제어, 선택 시 최상단 스크롤) */}
          <SectionTitle title="유형" en="Types" />
          <CourseTypeAccordion selected={selectedType} onSelect={setSelectedType} />
        </div>
      }
    />
  )
}
