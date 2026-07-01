'use client'

import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import SectionTitle from '@/components/common/SectionTitle'
import MarkdownRenderer from '@/components/common/MarkdownRenderer'
import WhiteBox from '@/components/common/WhiteBox'
import { EmptyState, LoadingState } from '@/components/common/StateView'
import CourseCard from '@/components/features/CourseCard'
import { useQuery } from '@/lib/useQuery'
import { getSiteContent, getCourses } from '@/lib/queries'
import type { SiteContent, Course } from '@/lib/types'

// §3-1 기관소개: site_contents(인사말·프로그램 개요) + courses 카드. 전부 읽기 전용.
export default function AboutPage() {
  const greeting = useQuery<SiteContent | null>(() => getSiteContent('intro_greeting'), null)
  const overview = useQuery<SiteContent | null>(() => getSiteContent('program_overview'), null)
  const courses = useQuery<Course[]>(getCourses, [])

  const hasGreeting = !!greeting.data?.body?.trim()

  return (
    <AppShell
      main={
        <div className="pb-8">
          <PageTitle title="ABOUT" subtitle="기관소개" />

          {/* 인사말 */}
          <section className="px-4 mb-8">
            <SectionTitle title="인사말" en="Greeting" />
            {greeting.loading ? (
              <LoadingState />
            ) : hasGreeting ? (
              <WhiteBox className="p-4">
                {greeting.data?.title && (
                  <h3 className="fluid-body font-[500] text-[#1f2937] mb-2">{greeting.data.title}</h3>
                )}
                <MarkdownRenderer content={greeting.data!.body!} />
              </WhiteBox>
            ) : (
              <EmptyState label="인사말이 곧 등록됩니다." />
            )}
          </section>

          {/* 주요 프로그램 */}
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
        <div className="space-y-6">
          {/* 브랜드 히어로 (로고 자산 없어 텍스트 워드마크) */}
          <WhiteBox className="p-8 text-center">
            <p className="fluid-nav-label font-raleway tracking-[3px] text-[#9ca3af]">
              PHYSICAL EDUCATION ASSOCIATION
            </p>
            <h2 className="fluid-page-title font-[200] tracking-[2px] text-[#1f2937] mt-2">
              체육교육회
            </h2>
          </WhiteBox>

          {/* 프로그램 개요 (site_contents) */}
          <section>
            <SectionTitle title="프로그램 개요" en="Overview" />
            {overview.loading ? (
              <LoadingState />
            ) : overview.data?.body?.trim() ? (
              <WhiteBox className="p-6">
                <MarkdownRenderer content={overview.data.body} />
              </WhiteBox>
            ) : (
              <EmptyState label="프로그램 개요가 곧 등록됩니다." />
            )}
          </section>

          {/* 과정 카드 그리드 */}
          <section>
            <SectionTitle title="전체 과정" en="Courses" />
            {courses.loading ? (
              <LoadingState />
            ) : courses.data.length === 0 ? (
              <EmptyState label="등록된 과정이 없습니다." />
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {courses.data.map((c) => (
                  <CourseCard key={c.id} course={c} />
                ))}
              </div>
            )}
          </section>
        </div>
      }
    />
  )
}
