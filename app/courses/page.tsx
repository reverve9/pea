'use client'

import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import SectionTitle from '@/components/common/SectionTitle'
import ExtendedHeader from '@/components/layout/ExtendedHeader'
import { PLACEHOLDER_SNS } from '@/lib/siteMeta'
import { LoadingState } from '@/components/common/StateView'
import ScheduleCalendar from '@/components/features/ScheduleCalendar'
import PriceTable from '@/components/features/PriceTable'
import { useQuery } from '@/lib/useQuery'
import { getSessions, getPriceItems } from '@/lib/queries'
import type { SessionWithCourse, PriceItem } from '@/lib/types'

// §3-2 연수안내: 연수일정 달력(sessions) + 비용표(price_items). 읽기 전용.
// extended(780)는 데스크탑 전용 → 비용표는 모바일(main·md:hidden)/데스크탑(extended)로 나눠 배치.
export default function CoursesPage() {
  const sessions = useQuery<SessionWithCourse[]>(getSessions, [])
  const prices = useQuery<PriceItem[]>(getPriceItems, [])

  return (
    <AppShell
      main={
        <div className="pb-8">
          <PageTitle title="연수안내" en="COURSES" />
          {/* 도입 리드 — 홈 슬로건/소개 레지스터(경량 font-300 + 넉넉한 행간 + 키워드만 강조). "볼드≠강조". */}
          <p className="px-4 pt-1 pb-8 font-score text-center text-[clamp(0.9375rem,3.9vw,1.0625rem)] font-[300] leading-[1.85] text-[#4b5563]">
            개설된 연수의 <span className="font-[500] text-[#1e3a5f]">일정과 비용</span>을 한눈에 안내합니다.<br />
            신청 전 회차와 유형을 확인하세요.
          </p>

          {/* 연수일정 달력 */}
          <section className="px-4 mb-8">
            <SectionTitle title="연수 일정" en="Schedule" />
            {sessions.loading ? <LoadingState /> : <ScheduleCalendar sessions={sessions.data} />}
          </section>

          {/* 비용 안내 — 모바일 전용(데스크탑은 우측 페인에서 노출) */}
          <section className="px-4 md:hidden">
            <SectionTitle title="비용 안내" en="Fees" />
            {prices.loading ? <LoadingState /> : <PriceTable items={prices.data} />}
          </section>
        </div>
      }
      extended={
        <div>
          <ExtendedHeader title="연수안내" eyebrow="COURSE" sns={PLACEHOLDER_SNS} />
          <SectionTitle title="비용 안내" en="Fees" />
          {prices.loading ? <LoadingState /> : <PriceTable items={prices.data} />}
        </div>
      }
    />
  )
}
