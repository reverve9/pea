'use client'

import React from 'react'
import Image from 'next/image'
import { PLACEHOLDER_ORG as ORG } from '@/lib/siteMeta'

// 홈 전용 푸터(나인브릿지 PWAFooter 형식): 회색 박스 + 로고 + 기관정보 전항목 + SNS + 저작권.
// 홈에만 배치(공용 레이아웃 아님). 나머지 페이지는 공용 SlimFooter. PWA 페인 폭 대응 = cqi clamp.
// ⚠ ORG 값은 전부 임의(placeholder) — siteMeta에서 공용 관리, 확정정보 수급 후 site_settings 연동.

// 나인브릿지 푸터 아이콘(인라인 svg)
const PhoneIcon = () => (
  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M6.62 10.79c1.44 2.83 3.76 5.14 6.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z" />
  </svg>
)
const FaxIcon = () => (
  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M19 8H5c-1.66 0-3 1.34-3 3v6h4v4h12v-4h4v-6c0-1.66-1.34-3-3-3zm-3 11H8v-5h8v5zm3-7c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1zm-1-9H6v4h12V3z" />
  </svg>
)
const MailIcon = () => (
  <svg className="w-3 h-3 shrink-0" viewBox="0 0 24 24" fill="currentColor">
    <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z" />
  </svg>
)

export default function HomeFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-[clamp(2.5rem,10cqi,3.75rem)] pb-4">
      <div className="bg-[#f5f5f5]">
        <div className="px-[clamp(1rem,5.6cqi,1.75rem)] py-6">
          {/* 로고 (모노 워드마크) */}
          <div className="relative mb-3 w-fit">
            <div
              aria-hidden
              className="pointer-events-none absolute -left-6 top-1/2 -translate-y-1/2 w-[120px] aspect-square"
              style={{ background: 'radial-gradient(circle, rgba(30,58,95,0.12) 0%, rgba(30,58,95,0) 70%)' }}
            />
            <Image
              src="/logo/pea-logo-mono.png"
              alt="체육교육회 — Physical Education Association"
              width={1890}
              height={400}
              className="relative w-[clamp(130px,32cqi,160px)] h-auto opacity-90"
            />
          </div>

          {/* 기관명 + 태그라인 */}
          <p className="text-[clamp(0.8125rem,3cqi,0.9375rem)] font-[600] text-[#333]">
            {ORG.name}
            <span className="ml-1.5 font-[300] text-[#666]">· {ORG.tagline}</span>
          </p>

          {/* 기관정보 전항목 */}
          <div className="mt-2 space-y-[1px] text-[clamp(0.75rem,2.6cqi,0.8125rem)] font-[300] text-[#4b5563] leading-relaxed">
            <p>
              {ORG.address} | 대표자: {ORG.ceo}
            </p>
            <p>
              입금계좌: {ORG.bank} {ORG.account} (예금주: {ORG.accountHolder})
            </p>
            <p>
              개인정보보호책임자: {ORG.privacyOfficer} ({ORG.privacyEmail})
            </p>
            <p className="flex items-center gap-1 flex-wrap">
              <span>고객센터:</span>
              <PhoneIcon />
              <span>{ORG.tel}</span>
              <FaxIcon />
              <span>{ORG.fax}</span>
              <span className="mx-0.5">|</span>
              <MailIcon />
              <span>{ORG.email}</span>
            </p>
          </div>
        </div>

        {/* 저작권 */}
        <div className="px-4 pb-3">
          <p className="text-[12px] font-[200] text-[#333] text-center">
            © {year}. {ORG.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
