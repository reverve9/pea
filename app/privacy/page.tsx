'use client'

import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import MarkdownRenderer from '@/components/common/MarkdownRenderer'
import { EmptyState, LoadingState } from '@/components/common/StateView'
import { useQuery } from '@/lib/useQuery'
import { getSiteContent } from '@/lib/queries'
import type { SiteContent } from '@/lib/types'

// 개인정보처리방침 — 슬림 푸터 링크 대상. 본문은 어드민(공지·FAQ > 개인정보처리방침 탭)에서 등록.
export default function PrivacyPage() {
  const policy = useQuery<SiteContent | null>(() => getSiteContent('privacy_policy'), null)
  const body = policy.data?.body?.trim() ?? ''

  return (
    <AppShell
      main={
        <div className="pb-8">
          <PageTitle title="개인정보처리방침" en="PRIVACY" />
          <section className="px-4">
            {policy.loading ? (
              <LoadingState />
            ) : body ? (
              <MarkdownRenderer content={body} />
            ) : (
              <EmptyState label="개인정보처리방침이 곧 등록됩니다." />
            )}
          </section>
        </div>
      }
    />
  )
}
