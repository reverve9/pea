'use client'

import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import { EmptyState } from '@/components/common/StateView'

// 개인정보처리방침 — 슬림 푸터 링크 대상. 실제 약관 문구 수급 후 채움(TODO: site_contents 연동).
export default function PrivacyPage() {
  return (
    <AppShell
      main={
        <div className="pb-8">
          <PageTitle title="개인정보처리방침" en="PRIVACY" />
          <section className="px-4">
            <EmptyState label="개인정보처리방침이 곧 등록됩니다." />
          </section>
        </div>
      }
    />
  )
}
