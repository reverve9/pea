'use client'

import React from 'react'
import { ShieldCheck, Smartphone } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import SectionTitle from '@/components/common/SectionTitle'
import WhiteBox from '@/components/common/WhiteBox'
import { Button } from '@/components/common/Button'

// §3-4 마이페이지: 본인확인(OTP) 게이트 안내 + 자리표시자. 실제 조회·환불·수정은 Phase 4.
const FEATURES = ['내 신청 내역 조회', '신청 정보 수정 요청', '환불 신청', '증명서 발급 문의']

export default function MyPage() {
  return (
    <AppShell
      main={
        <div className="pb-8">
          <PageTitle title="마이페이지" en="MY" />
          <section className="px-4">
            <WhiteBox className="p-6 text-center">
              <div className="w-14 h-14 rounded-full bg-[#eef2f7] flex items-center justify-center mx-auto mb-4">
                <ShieldCheck size={26} className="text-[#1e3a5f]" />
              </div>
              <h3 className="fluid-body font-[500] text-[#1f2937]">본인확인이 필요합니다</h3>
              <p className="fluid-nav-label text-[#6b7280] mt-2 leading-relaxed">
                신청 시 사용한 휴대폰 번호로 본인확인(인증)을 완료하면 내 신청 내역을 조회할 수 있습니다.
              </p>
              <Button size="md" disabled className="mt-5">
                <Smartphone size={15} className="mr-1.5" />
                본인확인 하기 (준비중)
              </Button>
            </WhiteBox>
          </section>
        </div>
      }
      extended={
        <div>
          <SectionTitle title="마이페이지 안내" en="My Page" />
          <WhiteBox className="p-6">
            <p className="fluid-body text-[#4b5563] leading-relaxed mb-4">
              본인확인 후 아래 기능을 이용할 수 있습니다. 인증·조회 기능은 준비 중입니다.
            </p>
            <ul className="space-y-2">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-2 fluid-body text-[#4b5563]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#1e3a5f]" />
                  {f}
                </li>
              ))}
            </ul>
          </WhiteBox>
        </div>
      }
    />
  )
}
