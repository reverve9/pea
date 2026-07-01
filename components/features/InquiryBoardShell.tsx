'use client'

import React from 'react'
import { Lock, PenLine } from 'lucide-react'
import { Button } from '@/components/common/Button'
import WhiteBox from '@/components/common/WhiteBox'
import { EmptyState } from '@/components/common/StateView'

// §3-5 문의 게시판 셸 — inquiries / certificate_requests 는 비밀글 + RLS 잠금이라
// anon 이 못 읽는다 → 데이터 바인딩 없이 UI 셸만. 작성·열람은 Phase 6(OTP).
export default function InquiryBoardShell({ kind }: { kind: 'general' | 'cert' }) {
  const isCert = kind === 'cert'
  const title = isCert ? '증명서 발급 문의' : '일반 문의'
  const desc = isCert
    ? '참가확인서 · 납입증명서 · 수료증 발급을 문의합니다.'
    : '연수·신청·환불 등 궁금한 점을 문의합니다.'

  return (
    <div className="space-y-3">
      {/* 헤더 + 글쓰기 자리표시자 */}
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3 className="fluid-body font-[500] text-[#1f2937]">{title}</h3>
          <p className="fluid-nav-label text-[#6b7280] mt-0.5">{desc}</p>
        </div>
        <Button size="sm" disabled className="shrink-0">
          <PenLine size={14} className="mr-1" />
          글쓰기
        </Button>
      </div>

      {/* 비밀글 안내 */}
      <WhiteBox className="p-4">
        <div className="flex items-start gap-2.5">
          <Lock size={16} className="text-[#9ca3af] shrink-0 mt-0.5" />
          <div>
            <p className="fluid-body font-[500] text-[#4b5563]">비밀글로 보호되는 게시판입니다.</p>
            <p className="fluid-nav-label text-[#9ca3af] mt-1 leading-relaxed">
              작성과 열람은 본인확인(휴대폰 인증) 후 가능합니다. 문의 작성·조회 기능은 준비 중입니다.
            </p>
          </div>
        </div>
      </WhiteBox>

      {/* 목록 자리(데이터 바인딩 없음) */}
      <EmptyState label="본인확인 후 내 문의 내역을 확인할 수 있습니다." icon={<Lock className="w-8 h-8" />} />
    </div>
  )
}
