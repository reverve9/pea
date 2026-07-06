'use client'

import { useMemo, useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import SectionTitle from '@/components/common/SectionTitle'
import ExtendedHeader from '@/components/layout/ExtendedHeader'
import { LoadingState } from '@/components/common/StateView'
import ScheduleCalendar, { scheduleMonths } from '@/components/features/ScheduleCalendar'
import CourseProgramMaster from '@/components/features/CourseProgramMaster'
import CourseOverview from '@/components/features/CourseOverview'
import {
  CourseTypesMobile,
  CourseTypeAccordion,
  DEFAULT_TYPE_KEY,
} from '@/components/features/CourseTypes'
import { ProgramTabs, PendingPanel } from '@/components/features/ProgramTabs'
import { PROGRAMS } from '@/lib/programs'
import { useQuery } from '@/lib/useQuery'
import { getSessions } from '@/lib/queries'
import type { SessionWithCourse } from '@/lib/types'

// §3-2 연수안내 — 데스크탑 셸: 좌 500 = 사이드바(도입·일정·유형 요약 마스터) / 우 780 = 메인(개요·일정·유형 상세).
// 마스터-디테일 페어링(좌↔우): 도입↔개요 · 일정 월별마스터↔캘린더 · 유형 좌카드↔아코디언.
// 선택 상태(월·유형)는 페이지에서 공유. 모바일은 좌 main 단일컬럼(캘린더=자체 월탭, 마스터 없음).
export default function CoursesPage() {
  const sessions = useQuery<SessionWithCourse[]>(getSessions, [])
  const [program, setProgram] = useState('ski') // 프로그램 층(기본 스키). 준비중 3종은 안내 없음.
  const [selectedType, setSelectedType] = useState<string | null>(DEFAULT_TYPE_KEY)
  const [monthIdx, setMonthIdx] = useState(0)
  const [selSession, setSelSession] = useState<string | null>(null)
  const months = useMemo(() => scheduleMonths(sessions.data ?? []), [sessions.data])
  const activeProgram = PROGRAMS.find((p) => p.key === program) ?? PROGRAMS[0]

  // 좌 마스터에서 차수 클릭 → 그 차수의 시작월로 캘린더 점프 + 행 하이라이트.
  const selectSession = (id: string | null) => {
    setSelSession(id)
    const s = (sessions.data ?? []).find((x) => x.id === id)
    if (!s) return
    const y = Number(s.starts_on.slice(0, 4))
    const m = Number(s.starts_on.slice(5, 7)) - 1
    const idx = months.findIndex((mo) => mo.y === y && mo.m === m)
    if (idx >= 0) setMonthIdx(idx)
  }

  return (
    <AppShell
      main={
        <div className="pb-[60px]">
          <PageTitle title="연수안내" en="COURSES" />
          {/* 도입 리드 — 홈 슬로건/소개 레지스터(경량 font-300 + 넉넉한 행간 + 키워드만 강조). "볼드≠강조". */}
          <p className="px-4 pt-1 pb-8 font-score text-center text-[clamp(0.9375rem,3.4cqi,1.0625rem)] font-[300] leading-[1.85] text-[#4b5563]">
            개설된 연수의 <span className="font-[500] text-[#1e3a5f]">일정과 유형</span>을 한눈에 안내합니다.<br />
            신청 전 회차와 유형을 확인하세요.
          </p>

          {/* 프로그램 탭 — 모바일 전용(데스크탑은 아래 좌측 프로그램 마스터가 선택 담당). */}
          <div className="px-4 md:hidden">
            <ProgramTabs active={program} onSelect={setProgram} />
          </div>

          {/* 데스크탑 좌측 단일 마스터 — 프로그램 아코디언 → 유형 카드(일정+유형 통합). 전 프로그램 항상 렌더. */}
          <section className="px-4 hidden md:block">
            {sessions.loading ? (
              <LoadingState />
            ) : (
              <CourseProgramMaster
                sessions={sessions.data}
                program={program}
                onProgram={setProgram}
                selectedType={selectedType}
                onSelectType={setSelectedType}
              />
            )}
          </section>

          {/* 모바일 콘텐츠 — 개요·캘린더·유형. 준비중 프로그램이면 안내 패널. */}
          <div className="md:hidden">
            {activeProgram.ready ? (
              <>
                <section className="px-4 mb-10">
                  <CourseOverview />
                </section>
                <section className="px-4 mb-8">
                  <SectionTitle title="일정" en="Schedule" rail />
                  {sessions.loading ? <LoadingState /> : <ScheduleCalendar sessions={sessions.data} />}
                </section>
                <section className="px-4">
                  <SectionTitle title="유형" en="Types" />
                  <CourseTypesMobile sessions={(sessions.data ?? []).filter((s) => s.course?.sport === activeProgram.sport)} />
                </section>
              </>
            ) : (
              <div className="px-4">
                <PendingPanel title={activeProgram.title} />
              </div>
            )}
          </div>
        </div>
      }
      extended={
        <div className="pb-[60px]">
          <ExtendedHeader title="연수안내" eyebrow="COURSES" />
          {/* 프로그램 선택은 좌측 마스터가 담당(데스크탑) — 우측은 순수 상세. */}
          {activeProgram.ready ? (
            <>
              {/* 연수 개요 — 데스크탑 우측 페인(모바일은 좌측 main에 표시) */}
              <div className="mb-10">
                <CourseOverview />
              </div>
              {/* 연수일정 캘린더 — 데스크탑 우측. 좌 마스터의 차수 클릭으로 월 점프 + 자체 월탭으로도 브라우징. */}
              <div className="mb-10">
                <SectionTitle title="일정" en="Schedule" />
                {sessions.loading ? (
                  <LoadingState />
                ) : (
                  <ScheduleCalendar
                    sessions={sessions.data}
                    monthIdx={monthIdx}
                    onMonthChange={setMonthIdx}
                    selectedId={selSession}
                    onSelect={selectSession}
                  />
                )}
              </div>
              {/* 유형 상세 — 데스크탑 우측 아코디언(좌 카드가 제어, 선택 시 최상단 스크롤) */}
              <SectionTitle title="유형" en="Types" />
              <CourseTypeAccordion selected={selectedType} onSelect={setSelectedType} />
            </>
          ) : (
            <PendingPanel title={activeProgram.title} />
          )}
        </div>
      }
    />
  )
}
