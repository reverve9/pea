'use client'

import React from 'react'
import { ShieldCheck, Award, MountainSnow } from 'lucide-react'

// 홈 요약 "왜 우리인가" = 신규 기관용 top-funnel 확신 섹션(신청·일정 아님).
// 연수 핵심 목표(ProgramGoals) 스타일 이식 — 아이콘 칩 + 제목/설명 가로 박스(흰 바탕·그림자).
// 홈은 cqi 컨테이너(페인 폭)라 md: 분기 대신 단일 공통 카드로 구성(모바일=데스크탑 좌측 페인 동일).
const POINTS = [
  { Icon: ShieldCheck, title: '서울시교육청 지정', desc: '체육 특수분야 직무연수기관으로 공식 지정된 과정' },
  { Icon: Award, title: 'NEIS 학점 인정', desc: '이수 시 직무연수 학점 등재 · 이수증 발급' },
  { Icon: MountainSnow, title: '현장 중심 2박 3일', desc: '슬로프에서 바로 쓰는 실기 · 즉시 학교 현장 적용' },
]

export default function HomeStrengths() {
  return (
    <section className="px-[clamp(1.5rem,7cqi,2.75rem)] py-[clamp(2rem,9cqi,3rem)]">
      {/* 텍스트 타이틀 영역 — 영문 아이브로우(질문) + 국문 슬로건(해답, 300+키워드 700). 데크는 3카드와 중복이라 제외 */}
      <div className="mb-[clamp(1.25rem,5cqi,1.75rem)]">
        <p className="font-raleway text-[clamp(0.8125rem,3.2cqi,1rem)] font-[400] uppercase tracking-[0.2em] text-[#2f8ba0]">
          Why It Matters
        </p>
        <h2 className="font-score text-[clamp(0.9375rem,5cqi,1.5rem)] font-[300] text-[#1e3a5f] leading-[1.3] tracking-[-0.2px] mt-2 whitespace-nowrap">
          <span className="font-[700]">현장 중심</span>의 실질적 학교 교육의 <span className="font-[700]">기준</span>
        </h2>
      </div>

      {/* 핵심 강점 카드 — 아이콘 칩(시안) + 제목/설명, 흰 박스·진한 그림자 */}
      <ul className="space-y-[clamp(0.625rem,3cqi,0.875rem)]">
        {POINTS.map(({ Icon, title, desc }) => (
          <li
            key={title}
            className="flex items-center gap-[clamp(0.875rem,4cqi,1.25rem)] rounded-[14px] bg-white p-[clamp(1rem,4.5cqi,1.375rem)] shadow-[0_2px_6px_rgba(0,0,0,0.06),0_14px_30px_-14px_rgba(0,0,0,0.22)]"
          >
            <span className="flex h-[clamp(2.5rem,11cqi,3rem)] w-[clamp(2.5rem,11cqi,3rem)] shrink-0 items-center justify-center rounded-full bg-[#eaf3f6]">
              <Icon className="h-[clamp(1.125rem,5cqi,1.375rem)] w-[clamp(1.125rem,5cqi,1.375rem)] text-[#2f8ba0]" strokeWidth={1.75} />
            </span>
            <div className="min-w-0">
              <p className="font-score text-[clamp(0.9375rem,3.4cqi,1.0625rem)] font-[500] text-[#1e3a5f] leading-tight">
                {title}
              </p>
              <p className="font-score text-[clamp(0.75rem,2.8cqi,0.875rem)] font-[300] text-[#6b7280] mt-1 leading-relaxed break-keep">
                {desc}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
