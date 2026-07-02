'use client'

import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import SectionTitle from '@/components/common/SectionTitle'
import ExtendedHeader from '@/components/layout/ExtendedHeader'
import CourseCard from '@/components/features/CourseCard'
import { EmptyState, LoadingState } from '@/components/common/StateView'
import { useQuery } from '@/lib/useQuery'
import { getCourses } from '@/lib/queries'
import { PLACEHOLDER_SNS } from '@/lib/siteMeta'
import type { Course } from '@/lib/types'

// 프로그램: 종목·과정 "소개" 페이지 (IA 확정안). 스키·스노보드 + 준비중 종목.
// 좌 = 종목 요약카드 / 우 = 과정 상세 + 지난 회차 갤러리(추후). 신청은 트랙 단위라 여기엔 개별 신청 없음.
export default function ProgramPage() {
  const courses = useQuery<Course[]>(getCourses, [])

  return (
    <AppShell
      main={
        <div className="pb-8">
          <PageTitle title="PROGRAM" subtitle="프로그램" />
          <section className="px-4">
            <SectionTitle title="주요 프로그램" en="Programs" />
            {courses.loading ? (
              <LoadingState />
            ) : courses.data.length === 0 ? (
              <EmptyState label="등록된 프로그램이 없습니다." />
            ) : (
              <div className="space-y-3">
                {courses.data.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            )}
          </section>
        </div>
      }
      extended={
        <div>
          <ExtendedHeader title="프로그램" eyebrow="PROGRAM" sns={PLACEHOLDER_SNS} />
          {/* 과정 상세 — 클라이언트 콘텐츠 수급 후 채움(가이드 초안 제공 예정) */}
          <section className="mb-8">
            <SectionTitle title="과정 상세" en="Detail" />
            <EmptyState label="과정 상세 내용이 곧 등록됩니다." />
          </section>
          {/* 지난 회차 갤러리 — 시각적 증거(커뮤니티 갤러리에서 소비) */}
          <section>
            <SectionTitle title="지난 회차 갤러리" en="Gallery" />
            <EmptyState label="지난 회차 사진이 곧 공개됩니다." />
          </section>
        </div>
      }
    />
  )
}
