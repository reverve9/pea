'use client'

import React, { useState, useEffect } from 'react'
import Modal from '@/components/common/Modal'
import AppShell from '@/components/layout/AppShell'
import ExtendedHeader from '@/components/layout/ExtendedHeader'
import PageTitle from '@/components/common/PageTitle'
import Pagination from '@/components/common/Pagination'
import { LoadingState } from '@/components/common/StateView'
import CommunityNewsList, { type Selection } from '@/components/features/CommunityNewsList'
import CommunityDetailPanel from '@/components/features/CommunityDetailPanel'
import NoticeDetail from '@/components/features/NoticeDetail'
import FaqAccordion from '@/components/features/FaqAccordion'
import InquiryBoardShell from '@/components/features/InquiryBoardShell'
import { useQuery } from '@/lib/useQuery'
import { getNotices, getFaqs } from '@/lib/queries'
import type { Notice, Faq } from '@/lib/types'

// §3-5 커뮤니티 — 나인브릿지 NEWS 이식. 좌(공지 보드+FAQ/문의 진입) ↔ 우(영역 스택: 공지/FAQ/문의).
// 좌 카드 클릭: 데스크탑=우측 해당 영역 점프 / 모바일=모달. 공지·FAQ = 페이지당 5(모바일 3) 페이지네이션.
type Modal = { kind: 'notice'; notice: Notice } | { kind: 'faq' } | { kind: 'inquiry' } | null

function pinnedFirst(a: Notice, b: Notice) {
  if (a.is_pinned && !b.is_pinned) return -1
  if (!a.is_pinned && b.is_pinned) return 1
  const ad = (a.published_at ?? a.created_at) ?? ''
  const bd = (b.published_at ?? b.created_at) ?? ''
  return bd.localeCompare(ad)
}

export default function CommunityPage() {
  const notices = useQuery<Notice[]>(getNotices, [])
  const faqs = useQuery<Faq[]>(getFaqs, [])
  const [isMobile, setIsMobile] = useState(false)
  const [selectedNoticeId, setSelectedNoticeId] = useState<string | null>(null)
  const [noticePage, setNoticePage] = useState(1)
  const [faqPage, setFaqPage] = useState(1)
  const [modal, setModal] = useState<Modal>(null)
  // 좌 카드 클릭 신호(펄스) — 값이 바뀌면 우측 FAQ 상단 열기 / 문의 내역 열기(클릭마다 재오픈).
  const [faqOpenPulse, setFaqOpenPulse] = useState(0)
  const [inquiryOpenPulse, setInquiryOpenPulse] = useState(0)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const pageSize = isMobile ? 3 : 5
  // pageSize 변경(뷰포트 전환) 시 페이지 리셋
  useEffect(() => {
    setNoticePage(1)
    setFaqPage(1)
  }, [pageSize])

  // 공지·FAQ = 카테고리 그룹핑 없이 '다 묶어' 평면 리스트 + 페이지네이션(좌/우 공유).
  const sortedNotices = [...notices.data].sort(pinnedFirst)
  const noticeTotalPages = Math.max(1, Math.ceil(sortedNotices.length / pageSize))
  const pagedNotices = sortedNotices.slice((noticePage - 1) * pageSize, noticePage * pageSize)

  const faqTotalPages = Math.max(1, Math.ceil(faqs.data.length / pageSize))
  const pagedFaqs = faqs.data.slice((faqPage - 1) * pageSize, faqPage * pageSize)

  const scrollToRegion = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const handleSelect = (sel: Selection) => {
    if (isMobile) {
      if (sel.kind === 'notice') {
        const n = notices.data.find((x) => x.id === sel.id)
        if (n) setModal({ kind: 'notice', notice: n })
      } else if (sel.kind === 'faq') {
        setModal({ kind: 'faq' })
      } else {
        setModal({ kind: 'inquiry' })
      }
      return
    }
    if (sel.kind === 'notice') {
      // 스크롤은 우측 아코디언이 해당 글로 직접(가운데) — 여기선 선택만(이중 스크롤 방지).
      setSelectedNoticeId(sel.id)
    } else if (sel.kind === 'faq') {
      scrollToRegion('community-faq')
      setFaqOpenPulse((n) => n + 1)
    } else {
      scrollToRegion('community-inquiry')
      setInquiryOpenPulse((n) => n + 1)
    }
  }

  const left = (
    <div className="pb-8">
      <PageTitle title="커뮤니티" en="COMMUNITY" />
      {/* 도입 리드 — 연수안내·신청과 동일 레지스터(font-score 300 · 중앙 · 행간 1.85 · 키워드만 네이비 강조) */}
      <p className="px-4 pt-1 pb-8 font-score text-center text-[clamp(0.9375rem,3.4cqi,1.0625rem)] font-[300] leading-[1.85] text-[#4b5563]">
        <span className="font-[500] text-[#1e3a5f]">공지사항</span>과{' '}
        <span className="font-[500] text-[#1e3a5f]">자주 묻는 질문</span>을 확인하세요.<br />
        궁금한 점은 1:1 문의로 남겨주실 수 있습니다.
      </p>
      {notices.loading ? (
        <LoadingState />
      ) : (
        <CommunityNewsList
          notices={pagedNotices}
          faqCount={faqs.data.length}
          onSelect={handleSelect}
          selectedNoticeId={selectedNoticeId}
          pagination={<Pagination page={noticePage} totalPages={noticeTotalPages} onChange={setNoticePage} />}
        />
      )}
    </div>
  )

  const right = (
    <div>
      <ExtendedHeader title="커뮤니티" eyebrow="COMMUNITY" />
      <CommunityDetailPanel
        notices={pagedNotices}
        faqs={pagedFaqs}
        selectedNoticeId={selectedNoticeId}
        noticePagination={<Pagination page={noticePage} totalPages={noticeTotalPages} onChange={setNoticePage} />}
        faqPagination={<Pagination page={faqPage} totalPages={faqTotalPages} onChange={setFaqPage} />}
        faqOpenPulse={faqOpenPulse}
        inquiryOpenPulse={inquiryOpenPulse}
      />
    </div>
  )

  return (
    <>
      <AppShell main={left} extended={right} />

      {/* 모바일 모달 (768 미만) */}
      {isMobile && modal && (
        <Modal onClose={() => setModal(null)}>
          {modal.kind === 'notice' && <NoticeDetail notice={modal.notice} />}
          {modal.kind === 'faq' && <FaqAccordion faqs={faqs.data} />}
          {modal.kind === 'inquiry' && <InquiryBoardShell />}
        </Modal>
      )}
    </>
  )
}
