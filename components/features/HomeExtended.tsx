'use client'

import React from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ClipboardPen } from 'lucide-react'

// 홈 우측(확장 페인) 브랜드 히어로 — 나인브릿지 ExtendedHome 구성 이식:
// 로고 → 슬로건(인용형 h2 + 소개 문단) → CTA + SNS, 세로 중앙 정렬(좌측 정렬 콘텐츠).
// 문구는 클라이언트 계획서(0630) 소개글을 다듬어 사용. 로고=모노 워드마크(밝은 배경용).
export default function HomeExtended() {
  return (
    <div className="flex justify-center" style={{ alignItems: 'start', paddingTop: 'calc(50vh - 220px)' }}>
      <div className="max-w-[640px]">
        {/* 브랜드 로고 (마크 + 체육교육회 + 영문 가로형) */}
        <div className="mb-9">
          <Image
            src="/logo/pea-logo-mono.png"
            alt="체육교육회 — Physical Education Association"
            width={1890}
            height={400}
            priority
            className="w-[340px] h-auto"
          />
        </div>

        {/* 슬로건 + 소개 (계획서 소개글 기반) */}
        <div className="mb-10">
          <h2 className="font-score text-[26px] font-[600] text-[#1f2937] mb-5 leading-snug">
            &ldquo;학교 현장 중심의 실질적 교육,<br />
            건강한 스포츠 문화를 선도합니다.&rdquo;
          </h2>
          <p className="text-[16px] font-[300] text-[#4b5563] leading-[1.85]">
            체육교육회는 <span className="font-[500] text-[#374151]">서울특별시교육청 지정 특수분야 직무연수기관</span>입니다.<br />
            학교 체육 현장에서 즉시 활용 가능한 실질적인 연수 프로그램을 통해,<br />
            교원의 전문 역량을 강화하고 모두가 함께 즐기는<br />
            건강한 스포츠 문화를 만들어갑니다.
          </p>
        </div>

        {/* CTA + SNS. 영역(max-w-640) 안에서 한 줄로 배치. */}
        <div className="flex items-center gap-2">
          <Link
            href="/application"
            className="flex items-center gap-1.5 px-4 py-2 bg-[#394053] text-white text-[13px] font-medium rounded-[4px] hover:bg-[#2d3444] transition-colors whitespace-nowrap"
          >
            <ClipboardPen size={16} strokeWidth={1.75} />
            연수 신청하기
          </Link>
        </div>
      </div>
    </div>
  )
}
