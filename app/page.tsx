import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import Maintenance from '@/components/common/Maintenance'
import HomeExtended from '@/components/features/HomeExtended'

// 홈. 우측(확장 페인) = 브랜드 히어로(HomeExtended, 나인브릿지 홈 우측 스타일).
// 좌측(PWA 페인) 위젯(최신뉴스·다가오는차수·최신갤러리·기관소개)은 후속 작업 → 현재 자리표시자.
export default function HomePage() {
  return (
    <AppShell
      main={
        <>
          <PageTitle title="HOME" subtitle="체육교육회" />
          <Maintenance />
        </>
      }
      extended={<HomeExtended />}
    />
  )
}
