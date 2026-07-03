'use client'

import React from 'react'

// 홈 요약 "왜 우리인가" = 신규 기관용 top-funnel 확신 섹션(신청·일정 아님).
// 에버그린 사실 3점(공식성·실익·현장성). 코스 카드의 DNA(Raleway 인덱스 넘버 + S-Core Dream)를 이어받아
// 에디토리얼하게 — 아이콘(클립아트감) 제거, CTA 제거(연수안내 CTA는 위 코스 카드가 담당, 중복 방지).
const POINTS = [
  { no: '01', title: '서울시교육청 지정', desc: '특수분야 직무연수기관' },
  { no: '02', title: 'NEIS 학점 인정', desc: '이수 완료 시 이수증 발급' },
  { no: '03', title: '현장 중심 2박 실습', desc: '즉시 적용 가능한 실기 교육' },
]

export default function HomeStrengths() {
  return (
    <section className="px-[clamp(1.5rem,7cqi,2.75rem)] py-[clamp(2rem,9cqi,3rem)]">
      <div className="mb-[clamp(1rem,4.5cqi,1.5rem)]">
        <p className="font-score text-[clamp(1.0625rem,4.2cqi,1.3125rem)] font-[700] text-[#1e3a5f] leading-tight">
          왜 체육교육회인가
        </p>
        <p className="text-[clamp(0.75rem,2.8cqi,0.875rem)] font-[300] text-[#6b7280] mt-1">
          공식성 · 실익 · 현장성을 갖춘 직무연수
        </p>
      </div>

      <ul>
        {POINTS.map(({ no, title, desc }) => (
          <li
            key={no}
            className="flex items-start gap-[clamp(0.875rem,4cqi,1.25rem)] py-[clamp(0.875rem,4cqi,1.25rem)] border-b border-[#eaeef3] last:border-0"
          >
            <span className="font-raleway text-[clamp(1.375rem,6cqi,1.875rem)] font-[600] leading-none text-[#4fb3c4] tabular-nums tracking-[0.02em] pt-[0.1em]">
              {no}
            </span>
            <div className="min-w-0">
              <p className="font-score text-[clamp(0.9375rem,3.4cqi,1.0625rem)] font-[700] text-[#1e3a5f] leading-tight">
                {title}
              </p>
              <p className="text-[clamp(0.75rem,2.8cqi,0.875rem)] font-[300] text-[#6b7280] mt-0.5">{desc}</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}
