'use client'

import React from 'react'
import { GraduationCap, Boxes, ChevronRight } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import SectionTitle from '@/components/common/SectionTitle'
import WhiteBox from '@/components/common/WhiteBox'
import { Badge } from '@/components/common/Badge'
import ExtendedHeader from '@/components/layout/ExtendedHeader'
import { PLACEHOLDER_SNS } from '@/lib/siteMeta'

// §3-3 연수신청: 선택페이지 골격만(직무연수 / 자율패키지 분기). 자리표시자 — 실제 폼·금액계산은 Phase 3.
type Track = {
  key: string
  icon: React.ReactNode
  title: string
  desc: string
}

const TRACKS: Track[] = [
  {
    key: 'jikmu',
    icon: <GraduationCap size={22} className="text-[#1e3a5f]" />,
    title: '직무연수 신청',
    desc: '교원 스키·스노보드 지도법 직무연수(2박) 신청 과정입니다.',
  },
  {
    key: 'jayul',
    icon: <Boxes size={22} className="text-[#1e3a5f]" />,
    title: '자율패키지 신청',
    desc: '주중·주말 일정과 인원을 선택하는 자율패키지 신청 과정입니다.',
  },
]

function TrackCard({ track }: { track: Track }) {
  return (
    <WhiteBox className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-full bg-[#f3f4f6] flex items-center justify-center shrink-0">
          {track.icon}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="fluid-body font-[500] text-[#1f2937]">{track.title}</h3>
            <Badge color="slate" size="sm">
              준비중
            </Badge>
          </div>
          <p className="fluid-nav-label text-[#6b7280] mt-1 leading-relaxed">{track.desc}</p>
        </div>
        <ChevronRight size={18} className="text-[#d1d5db] shrink-0 mt-2" />
      </div>
    </WhiteBox>
  )
}

export default function ApplyPage() {
  return (
    <AppShell
      main={
        <div className="pb-8">
          <PageTitle title="신청" en="APPLICATION" />
          <section className="px-4">
            <SectionTitle title="신청 유형 선택" en="Choose" />
            <div className="space-y-3">
              {TRACKS.map((t) => (
                <TrackCard key={t.key} track={t} />
              ))}
            </div>
            <p className="fluid-nav-label text-[#9ca3af] mt-4 px-1 leading-relaxed">
              신청서 작성 · 인원 · 금액 계산 기능은 준비 중입니다. 일정과 비용은{' '}
              <span className="text-[#3f6a99]">연수안내</span> 에서 먼저 확인하실 수 있습니다.
            </p>
          </section>
        </div>
      }
      extended={
        <div>
          <ExtendedHeader title="신청" eyebrow="APPLICATION" sns={PLACEHOLDER_SNS} />
          <SectionTitle title="신청 안내" en="Guide" />
          <WhiteBox className="p-6">
            <p className="fluid-body text-[#4b5563] leading-relaxed">
              연수신청은 직무연수와 자율패키지 두 유형으로 나뉩니다. 유형을 선택하면 일정 차수와
              인원을 지정해 신청하게 됩니다. 현재는 화면 골격만 제공되며, 실제 신청·결제(무통장)
              기능은 준비 중입니다.
            </p>
          </WhiteBox>
        </div>
      }
    />
  )
}
