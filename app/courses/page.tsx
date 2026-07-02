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
          <p className="px-4 -mt-1 mb-6 text-[clamp(0.8125rem,3.6vw,0.9375rem)] font-[300] leading-relaxed text-[#6b7280]">
            개설된 연수의 일정과 비용을 안내합니다. 신청 전 회차·유형을 확인하세요.
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
