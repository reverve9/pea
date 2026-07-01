import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import Maintenance from '@/components/common/Maintenance'

// 연수안내 자리표시자. 실제 콘텐츠(비용표·일정 달력 렌더)는 후속 Phase 2b.
export default function CoursesPage() {
  return (
    <AppShell
      main={
        <>
          <PageTitle title="COURSES" subtitle="연수안내" />
          <Maintenance />
        </>
      }
      extended={<Maintenance size="large" />}
    />
  )
}
