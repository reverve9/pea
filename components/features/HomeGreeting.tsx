'use client'

import React from 'react'
import ImageSlider, { type Slide } from './ImageSlider'

// 홈 좌측 도입부(인사말/소개) = 카드 없이 아이덴티티를 드러내는 타이포 배치(나인브릿지 홈 방식).
// "인사말" 같은 라벨 타이틀 없음. 상단 이미지 슬라이더로 첫인상 강화.
// 문구는 클라이언트 계획서(0630) 2p 인사말. TODO(CMS): 후속 site_contents(intro_greeting) 연동.

// TODO(이미지): 액션샷/장소/시설 가로 사진을 public/home/ 에 넣고 아래 src 채우기.
// 파일명 예: /home/hero-1.jpg … 지금은 src 비워 브랜드 플레이스홀더 노출.
const HERO_SLIDES: Slide[] = [
  { alt: '스키·스노보드 지도 연수 현장' },
  { alt: '연수 장소 · 시설' },
  { alt: '현장 실습 교육' },
]

export default function HomeGreeting() {
  return (
    // containerType: inline-size → 하위 cqi 단위가 "페인 폭" 기준으로 스케일(뷰포트 아님).
    // 500 미만=페인이 뷰포트라 유동 / 500 고정=값도 고정. 모바일 375~430 정확 대응.
    <div style={{ containerType: 'inline-size' }}>
      {/* 상단 이미지 슬라이더 (풀블리드, aspect-ratio 로 폭 따라 스케일) */}
      <ImageSlider slides={HERO_SLIDES} />

      {/* 아이덴티티 도입부 — 카드 없음, 그라디언트 글로우 + 대형 헤드라인 */}
      {/* 패딩: clamp(16 → 28), max 는 500px 페인 기준(5.6cqi=28 @500) */}
      <section className="relative pt-[clamp(1.25rem,7cqi,2.25rem)] pb-4 px-[clamp(1rem,5.6cqi,1.75rem)]">
        <div
          aria-hidden
          className="pointer-events-none absolute -left-12 top-2 w-[56cqi] max-w-[280px] aspect-square"
          style={{ background: 'radial-gradient(circle, rgba(30,58,95,0.10) 0%, rgba(30,58,95,0) 70%)' }}
        />

        {/* 헤드라인: clamp(20 → 24), 6cqi=30 @500 이라 24 에서 캡 */}
        <h2 className="relative font-score text-[clamp(1.25rem,6cqi,1.5rem)] font-[300] text-[#1e3a5f] leading-[1.4] tracking-[-0.2px] mb-6">
          현장 중심의 <span className="font-[700]">실천 교육</span>으로<br />
          학교 체육의 <span className="font-[700]">미래</span>를 열어갑니다.
        </h2>

        {/* 본문: clamp(14 → 15) */}
        <div className="relative text-[clamp(0.875rem,3.4cqi,0.9375rem)] font-[300] text-[#4b5563] leading-[1.85] space-y-3">
          <p>안녕하십니까. 체육교육회입니다.</p>
          <p>
            본 회는 <span className="font-[500] text-[#374151]">서울특별시교육청 지정 특수분야 직무연수기관</span>으로서,
            학교 체육 현장에서 즉각적인 실효성을 발휘할 수 있는 실무 중심의 연수 프로그램을 기획·운영하고 있습니다.
          </p>
          <p>
            교육 현장의 요구를 반영한 깊이 있는 교육을 통해 교원의 전문 역량을 강화하고,
            나아가 공교육 내에 건강하고 지속 가능한 스포츠 문화가 정착될 수 있도록 최선을 다하겠습니다.
          </p>
        </div>
      </section>
    </div>
  )
}
