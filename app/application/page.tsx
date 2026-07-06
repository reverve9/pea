'use client'

import { useEffect, useState } from 'react'
import { GraduationCap, Boxes, ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import SectionTitle from '@/components/common/SectionTitle'
import WhiteBox from '@/components/common/WhiteBox'
import Text from '@/components/common/Text'
import Modal from '@/components/common/Modal'
import ExtendedHeader from '@/components/layout/ExtendedHeader'
import JikmuApplyForm from '@/components/features/JikmuApplyForm'
import JayulApplyForm from '@/components/features/JayulApplyForm'
import { PendingPanel } from '@/components/features/ProgramTabs'
import DuotoneHero from '@/components/features/DuotoneHero'
import { PROGRAMS, type Program } from '@/lib/programs'

// §3-5 연수신청 — 좌우 동일 층위(프로그램 → 유형). 좌(main)=마스터 인덱스, 우(extended)=상세.
// 층1 = 프로그램(종목) : 스키·스노보드 + 준비중 3종. 우 페인에서 탭으로 전환.
// 층2 = 유형(스키 전용) : 직무연수 / 자율패키지 카드 택1 → 폼.
// 모바일 = 확장 페인 숨김 → 좌 카드 탭 시 중앙 모달(커뮤니티 ModalShell 스타일)로 폼/준비중.
const NAVY = '#1e3a5f'
const GREEN = '#2f803a'

type Track = {
  key: string
  icon: LucideIcon
  accent: string
  title: string
  spec: string
  desc: string
}

// 스키·스노보드 하위 유형(층2). 다른 종목 개설 시 프로그램별 트랙 맵으로 확장.
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

// 유형별 폼 본문 — 직무·자율 신청 폼.
function trackBody(key: string) {
  if (key === 'jikmu') return <JikmuApplyForm />
  if (key === 'jayul') return <JayulApplyForm />
  return (
    <WhiteBox className="p-6">
      <Text variant="body">해당 유형은 준비 중입니다.</Text>
    </WhiteBox>
  )
}

// 유형 카드 — /courses CourseTypeCards 마크업. 선택 시 유형색 틴트.
// compact=true(우 페인) → desc(서브텍스트)만 숨김. 박스·아이콘·타이틀·스펙은 좌측과 동일.
function TrackCard({ track, selected, compact, onSelect }: { track: Track; selected: boolean; compact?: boolean; onSelect: () => void }) {
  const Icon = track.icon
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="block w-full rounded-[10px] border border-[#e5eaef] text-left transition-colors"
      style={{ background: selected ? track.accent + '14' : '#f2f5f9' }}
    >
      <div className={`flex items-center gap-3 px-4 pt-4 ${compact ? 'pb-4' : ''}`}>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: track.accent + '14' }}>
          <Icon size={18} strokeWidth={1.75} style={{ color: track.accent }} />
        </span>
        <span className="min-w-0 flex-1">
          <Text variant="card-title" as="span" className="block">{track.title}</Text>
          <Text variant="card-sub" as="span" className="mt-0.5 block">{track.spec}</Text>
        </span>
      </div>
      {!compact && (
        <Text as="p" variant="sub" className="pl-16 pr-4 pt-2.5 pb-4">
          {track.desc}
        </Text>
      )}
    </button>
  )
}

// 선택된 유형 배너(데스크탑 우 페인) — 유형 선택 시 2카드를 접고 활성 유형을 솔리드 유형색으로 승격.
// 긴 폼을 스크롤해도 "지금 이 유형 작성 중"이 각인됨. '다른 유형'으로 선택 해제(2카드 복귀).
function SelectedTypeBanner({ track, onSwitch }: { track: Track; onSwitch: (key: string) => void }) {
  const Icon = track.icon
  const other = TRACKS.find((t) => t.key !== track.key)
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      {/* 현재 유형 배지 카드 — 1/2 폭(유형 전환해도 통일), 유형색 라이트 틴트 */}
      <div
        className="flex w-1/2 min-w-0 items-center gap-2.5 rounded-[10px] border border-[#e5eaef] px-3.5 py-2.5"
        style={{ background: track.accent + '14' }}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: track.accent + '24' }}
        >
          <Icon size={15} strokeWidth={1.75} style={{ color: track.accent }} />
        </span>
        <Text variant="card-title" as="span" color={track.accent}>{track.title}</Text>
        <Text variant="card-sub" as="span" className="truncate">{track.spec}</Text>
      </div>
      {/* 반대 유형 전환 — 솔리드 필(반대 유형색 배경 + 화이트 텍스트)로 강조 */}
      {other && (
        <button
          type="button"
          onClick={() => onSwitch(other.key)}
          className="flex shrink-0 items-center gap-1 rounded-[8px] px-3.5 py-2 text-white transition-[filter] hover:brightness-95"
          style={{ background: other.accent }}
        >
          <Text variant="card-title-sm" as="span" color="#fff">{other.title} 신청하기</Text>
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  )
}

// 준비중 프로그램 좌측 카드(마스터) — 클릭 시 우 페인/모달에 준비중 패널.
function PendingCard({ selected, onSelect }: { selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className="flex w-full items-center justify-center rounded-[10px] border border-[#e5eaef] py-6 transition-colors"
      style={{ background: selected ? '#eef2f6' : '#f2f5f9' }}
    >
      <Text variant="sub" color="#9ca3af">준비중</Text>
    </button>
  )
}

type Modal = { kind: 'form'; key: string } | { kind: 'pending'; title: string }

export default function ApplyPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [program, setProgram] = useState('ski') // 층1 (기본 스키)
  const [type, setType] = useState('jikmu') // 층2 — 기본 '직무' 노출(폼 처음부터). 자율 전환=배너 스위치/좌 마스터
  const [modal, setModal] = useState<Modal | null>(null)

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // 좌 유형 카드(스키) 선택 → 데스크탑=우 동기화 / 모바일=폼 모달.
  const selectTrack = (key: string) => {
    setProgram('ski')
    setType(key)
    if (isMobile) setModal({ kind: 'form', key })
  }
  // 좌 준비중 카드 선택 → 데스크탑=우 준비중 패널 / 모바일=준비중 모달.
  const selectPending = (p: Program) => {
    setProgram(p.key)
    if (isMobile) setModal({ kind: 'pending', title: p.title })
  }

  const activeProgram = PROGRAMS.find((p) => p.key === program) ?? PROGRAMS[0]

  const main = (
    <div className="pb-8">
      <PageTitle title="신청" en="APPLICATION" />
      <p className="px-4 pt-1 pb-8 font-score text-center text-[clamp(0.9375rem,3.4cqi,1.0625rem)] font-[300] leading-[1.85] text-[#4b5563]">
        신청할 <span className="font-[500] text-[#1e3a5f]">프로그램</span>과 연수과정별 유형을 선택하세요.<br />
        유형에 따라 회차와 인원을 지정해 신청하실 수 있습니다.
      </p>
      <section className="px-4">
        {PROGRAMS.map((p) => (
          <div key={p.key} className="mb-8">
            <SectionTitle title={p.title} en={p.en} rail />
            {p.ready ? (
              <div className="space-y-3">
                {TRACKS.map((t) => (
                  <TrackCard
                    key={t.key}
                    track={t}
                    selected={!isMobile && program === p.key && type === t.key}
                    onSelect={() => selectTrack(t.key)}
                  />
                ))}
              </div>
            ) : (
              <PendingCard selected={!isMobile && program === p.key} onSelect={() => selectPending(p)} />
            )}
          </div>
        ))}
      </section>
    </div>
  )

  const right = (
    <div>
      <ExtendedHeader title="신청" eyebrow="APPLICATION" />
      {/* 우측 상단 탭 제거(프로그램 페이지와 동일) — 히어로 도입 + 좌측 마스터가 종목 선택 담당(중복 제거). */}
      {activeProgram.ready ? (
        <div>
          <DuotoneHero eyebrow="SKI & SNOWBOARD" title="원하는 일정과 유형을 골라 신청하세요" imgs={['/application/hero.jpg']} tint={0} />
          {/* 우 페인 = 연수유형(정식 섹션 타이틀) + 활성 유형 배너(스위치) + 폼(기본 직무 노출). 하단 2카드/안내박스 제거. */}
          <SectionTitle title="연수유형" />
          <SelectedTypeBanner track={TRACKS.find((t) => t.key === type)!} onSwitch={setType} />
          {trackBody(type)}
        </div>
      ) : (
        <PendingPanel title={activeProgram.title} />
      )}
    </div>
  )

  return (
    <>
      <AppShell main={main} extended={right} />
      {isMobile && modal && (
        <Modal
          onClose={() => setModal(null)}
          title={modal.kind === 'form' ? (TRACKS.find((t) => t.key === modal.key)?.title ?? '신청') : modal.title}
        >
          {modal.kind === 'form' ? trackBody(modal.key) : <PendingPanel title={modal.title} />}
        </Modal>
      )}
    </>
  )
}
