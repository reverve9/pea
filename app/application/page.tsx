'use client'

import { GraduationCap, Boxes } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import SectionTitle from '@/components/common/SectionTitle'
import WhiteBox from '@/components/common/WhiteBox'
import Text from '@/components/common/Text'
import ExtendedHeader from '@/components/layout/ExtendedHeader'

// 카드 정본 = /courses CourseTypeCards. 직무=네이비 / 자율=포레스트그린(연수안내와 동일 아이콘·accent).
const NAVY = '#1e3a5f'
const GREEN = '#2f803a'

// §3-3 연수신청: 선택페이지 골격만(직무연수 / 자율패키지 분기). 자리표시자 — 실제 폼·금액계산은 Phase 3.
type Track = {
  key: string
  icon: LucideIcon
  accent: string
  title: string
  spec: string
  desc: string
}

const TRACKS: Track[] = [
  {
    key: 'jikmu',
    icon: GraduationCap,
    accent: NAVY,
    title: '직무연수',
    spec: '2박 3일 · NEIS 1학점 인정',
    desc: '교원 대상 스키·스노보드 지도법 직무연수 과정입니다.',
  },
  {
    key: 'jayul',
    icon: Boxes,
    accent: GREEN,
    title: '자율패키지',
    spec: '주중·주말 선택 · 학점 미인정',
    desc: '희망 일정과 인원을 선택하는 자율 연수 패키지입니다.',
  },
]

// 준비중 프로그램 — 종목 확장 자리표시자(테니스·윈드서핑·운동처방)
const PENDING_PROGRAMS = [
  { key: 'tennis', title: '테니스', en: 'Tennis' },
  { key: 'windsurf', title: '윈드서핑', en: 'Windsurfing' },
  { key: 'rehab', title: '운동처방', en: 'Exercise Rx' },
]

// 카드 정본 = /courses CourseTypeCards 마크업 그대로: 연회색 필 + rounded-10 보더 + 좌 아이콘서클 + 제목/스펙 + 우측 값.
function TrackCard({ track }: { track: Track }) {
  const Icon = track.icon
  return (
    <button
      type="button"
      className="block w-full rounded-[10px] border border-[#e5eaef] text-left transition-colors"
      style={{ background: '#f2f5f9' }}
    >
      <div className="flex items-center gap-3 px-4 pt-4">
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: track.accent + '14' }}
        >
          <Icon size={18} strokeWidth={1.75} style={{ color: track.accent }} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-score text-[14.5px] font-[500] text-[#1e3a5f]">{track.title}</span>
          <span className="mt-0.5 block font-score text-[12px] font-[400] text-[#6b7280]">{track.spec}</span>
        </span>
      </div>
      {/* 하단 설명 서브텍스트 — 정본 Text 'sub' 변형. 시작점을 위 제목/스펙과 정렬(pl-16 = px-4+아이콘36+gap12) */}
      <Text as="p" variant="sub" className="pl-16 pr-4 pt-2.5 pb-4">
        {track.desc}
      </Text>
    </button>
  )
}

export default function ApplyPage() {
  return (
    <AppShell
      main={
        <div className="pb-8">
          <PageTitle title="신청" en="APPLICATION" />
          {/* 도입 리드 — 연수안내와 동일 레지스터(font-score 300 · 중앙 · 행간 1.85 · 키워드만 네이비 강조). "볼드≠강조". */}
          <p className="px-4 pt-1 pb-8 font-score text-center text-[clamp(0.9375rem,3.9vw,1.0625rem)] font-[300] leading-[1.85] text-[#4b5563]">
            신청할 <span className="font-[500] text-[#1e3a5f]">프로그램</span>과 연수과정별 유형을 선택하세요.<br />
            유형에 따라 회차와 인원을 지정해 신청하실 수 있습니다.
          </p>
          <section className="px-4">
            {/* 스키·스노보드 — 개설 프로그램. 현재 2유형(직무/자율) 그대로 유지 */}
            <SectionTitle title="스키·스노보드" en="Ski & Snowboard" rail />
            <div className="space-y-3 mb-8">
              {TRACKS.map((t) => (
                <TrackCard key={t.key} track={t} />
              ))}
            </div>

            {/* 준비중 프로그램 — 각 섹션타이틀 + 하단 준비중 카드(위 유형 카드와 동일 필·보더) */}
            {PENDING_PROGRAMS.map((p) => (
              <div key={p.key} className="mb-8">
                <SectionTitle title={p.title} en={p.en} rail />
                <div
                  className="flex items-center justify-center rounded-[10px] border border-[#e5eaef] py-6"
                  style={{ background: '#f2f5f9' }}
                >
                  <span className="font-score text-[13px] font-[500] text-[#9ca3af]">준비중</span>
                </div>
              </div>
            ))}

            <p className="fluid-nav-label text-[#9ca3af] mt-4 px-1 leading-relaxed">
              신청서 작성 · 인원 · 금액 계산 기능은 준비 중입니다. 일정과 비용은{' '}
              <span className="text-[#3f6a99]">연수안내</span> 에서 먼저 확인하실 수 있습니다.
            </p>
          </section>
        </div>
      }
      extended={
        <div>
          <ExtendedHeader title="신청" eyebrow="APPLICATION" />
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
