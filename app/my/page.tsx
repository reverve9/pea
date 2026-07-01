import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import Maintenance from '@/components/common/Maintenance'

// 마이페이지 자리표시자. 실제 조회(OTP 게이트 + 신청내역)는 후속 Phase 4.
export default function MyPage() {
  return (
    <AppShell
      main={
        <>
          <PageTitle title="MY" subtitle="마이페이지" />
          <Maintenance />
        </>
      }
      extended={<Maintenance size="large" />}
    />
  )
}
