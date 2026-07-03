'use client'

import React from 'react'
import SectionTitle from '@/components/common/SectionTitle'
import NoticeGroupAccordion from './NoticeGroupAccordion'
import FaqAccordion from './FaqAccordion'
import InquiryBoardShell from './InquiryBoardShell'
import type { Notice, Faq } from '@/lib/types'

// 우측(Extended) 콘텐츠 — 탭 없이 세로 영역 스택(좌 인덱스와 통일). 좌 카드 클릭 시 해당 영역으로 점프.
// 공지·FAQ = 카테고리 그룹핑 없이 평면 리스트 + 페이지네이션(섹션타이틀 우측). 카테고리는 제목 앞 배지.
// SectionTitle은 full 변형(콘텐츠 톤) — 좌측 rail(인덱스 톤)과 위계 차별화.
interface Props {
  notices: Notice[]
  faqs: Faq[]
  selectedNoticeId?: string | null
  noticePagination?: React.ReactNode
  faqPagination?: React.ReactNode
  faqOpenPulse?: number
  inquiryOpenPulse?: number
}

export default function CommunityDetailPanel({
  notices,
  faqs,
  selectedNoticeId,
  noticePagination,
  faqPagination,
  faqOpenPulse,
  inquiryOpenPulse,
}: Props) {
  return (
    <div className="space-y-10">
      <section id="community-notices" className="scroll-mt-4">
        <SectionTitle title="공지사항" right={noticePagination} />
        <NoticeGroupAccordion notices={notices} selectedNoticeId={selectedNoticeId} />
      </section>

      <section id="community-faq" className="scroll-mt-4">
        <SectionTitle title="자주 묻는 질문" right={faqPagination} />
        <FaqAccordion faqs={faqs} openPulse={faqOpenPulse} />
      </section>

      <section id="community-inquiry" className="scroll-mt-4">
        <SectionTitle title="1:1 문의" />
        <InquiryBoardShell openPulse={inquiryOpenPulse} />
      </section>
    </div>
  )
}
