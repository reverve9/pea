import { ReactNode } from 'react'

// 커뮤니티는 page.tsx(클라이언트)가 상태 공유형 2페인(AppShell)을 직접 구성한다.
// 나인브릿지 NEWS 방식(상태 기반)으로 이관하며 기존 parallel-route(@detail) 인터셉트는 제거.
// 공유·SEO용 풀페이지(notices/[id])는 자체 AppShell을 쓴다.
export default function CommunityLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
