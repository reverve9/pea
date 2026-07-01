import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import Maintenance from '@/components/common/Maintenance'

// 기관소개 자리표시자. 실제 콘텐츠(site_contents 렌더)는 후속 Phase 2b.
export default function AboutPage() {
  return (
    <AppShell
      main={
        <>
          <PageTitle title="ABOUT" subtitle="기관소개" />
          <Maintenance />
        </>
      }
      extended={<Maintenance size="large" />}
    />
  )
}
