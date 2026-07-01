import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import Maintenance from '@/components/common/Maintenance'

// 연수신청 자리표시자. 실제 신청폼·가격계산은 후속 Phase 3.
export default function ApplyPage() {
  return (
    <AppShell
      main={
        <>
          <PageTitle title="APPLY" subtitle="연수신청" />
          <Maintenance />
        </>
      }
      extended={<Maintenance size="large" />}
    />
  )
}
