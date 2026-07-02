import { ReactNode } from 'react'
import AppShell from '@/components/layout/AppShell'
import ExtendedHeader from '@/components/layout/ExtendedHeader'
import { PLACEHOLDER_SNS } from '@/lib/siteMeta'

// Phase 2.6: 커뮤니티는 parallel routes 로 리스트/상세를 분리.
//   {children} = 리스트(PWA 500 페인)  |  {detail} = @detail 슬롯(Extended 780 / 모바일 드로어)
// AppShell 은 수정 없이 여기서 두 슬롯을 두 페인에 배치만 한다.
// 우측 마스트헤드는 상세 swap 위에 상시 노출(빈상태·상세 공통).
export default function CommunityLayout({
  children,
  detail,
}: {
  children: ReactNode
  detail: ReactNode
}) {
  return (
    <AppShell
      main={children}
      extended={
        <div>
          <ExtendedHeader title="커뮤니티" eyebrow="COMMUNITY" sns={PLACEHOLDER_SNS} />
          {detail}
        </div>
      }
    />
  )
}
