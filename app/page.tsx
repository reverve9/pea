import AppShell from '@/components/layout/AppShell'
import HomeExtended from '@/components/features/HomeExtended'
import HomeGreeting from '@/components/features/HomeGreeting'
import HomeCourses from '@/components/features/HomeCourses'
import HomeStrengths from '@/components/features/HomeStrengths'
import HomeFooter from '@/components/features/HomeFooter'

// 홈. 페이지 타이틀 없음(홈은 네비 메뉴 아님).
// 우측(확장 페인, 데스크탑) = 소개글 브랜드 히어로(HomeExtended).
// 좌측(PWA 페인, 데·모 공통) = 인사말 첫 섹션 + 후속 위젯(다가오는 차수·주요 프로그램 등).
export default function HomePage() {
  return (
    <AppShell
      main={
        // containerType: inline-size → 홈 좌측 전체가 cqi 기준 컨테이너(페인 폭). 하위 위젯·푸터 공유.
        <div style={{ containerType: 'inline-size' }}>
          <HomeGreeting />
          <HomeCourses />
          {/* "왜 우리인가" 신뢰/강점 = 홈 요약의 확신 섹션(신규 기관용, top-funnel) */}
          <HomeStrengths />
          <HomeFooter />
        </div>
      }
      extended={<HomeExtended />}
    />
  )
}
