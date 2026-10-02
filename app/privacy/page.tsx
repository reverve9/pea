'use client'

import { useState } from 'react'
import AppShell from '@/components/layout/AppShell'
import ExtendedHeader from '@/components/layout/ExtendedHeader'
import PageTitle from '@/components/common/PageTitle'
import { PolicyAccordion, PolicyArticle, PolicyIndex, usePrivacyPolicy } from '@/components/features/PrivacyPolicyBody'

// 개인정보처리방침 — 셸 규칙(좌 PWA 페인 / 우 확장 페인), 조항 단위 열람(전문 장문 스크롤 금지).
// 데스크탑: 좌 = 조항 목차, 우 = 선택 조항 본문. 모바일(확장 페인 숨김) 직접 진입: 좌 페인에 조항 아코디언.
// 모바일 푸터 링크는 이 페이지로 이동하지 않고 공용 Modal 로 연다(SlimFooter).
export default function PrivacyPage() {
  const policy = usePrivacyPolicy()
  const [selected, setSelected] = useState(0)

  const select = (i: number) => {
    setSelected(i)
    // 확장 페인 스크롤을 조항 시작으로(긴 조항 읽다가 다음 조항으로 넘어갈 때).
    document.getElementById('privacy-article')?.scrollIntoView({ block: 'start' })
  }

  return (
    <AppShell
      main={
        <div className="pb-8">
          <PageTitle title="개인정보처리방침" en="PRIVACY" />
          <section className="px-4 md:hidden">
            <PolicyAccordion loading={policy.loading} sections={policy.sections} />
          </section>
          <section className="hidden px-8 md:block">
            <PolicyIndex sections={policy.sections} selected={selected} onSelect={select} />
          </section>
        </div>
      }
      extended={
        <div id="privacy-article">
          <ExtendedHeader title="개인정보처리방침" eyebrow="PRIVACY" />
          <PolicyArticle loading={policy.loading} sections={policy.sections} selected={selected} onSelect={select} />
        </div>
      }
    />
  )
}
