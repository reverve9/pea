'use client'

import { useEffect, useState } from 'react'
import { GraduationCap, Boxes } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import SectionTitle from '@/components/common/SectionTitle'
import WhiteBox from '@/components/common/WhiteBox'
import Text from '@/components/common/Text'
import Modal from '@/components/common/Modal'
import ExtendedHeader from '@/components/layout/ExtendedHeader'
import JikmuApplyForm from '@/components/features/JikmuApplyForm'

// §3-5 연수신청 — 좌우 동일 층위(프로그램 → 유형). 좌(main)=마스터 인덱스, 우(extended)=상세.
// 층1 = 프로그램(종목) : 스키·스노보드 + 준비중 3종. 우 페인에서 탭으로 전환.
// 층2 = 유형(스키 전용) : 직무연수 / 자율패키지 카드 택1 → 폼.
// 모바일 = 확장 페인 숨김 → 좌 카드 탭 시 중앙 모달(커뮤니티 ModalShell 스타일)로 폼/준비중.
const NAVY = '#1e3a5f'
const GREEN = '#2f803a'

type Program = { key: string; title: string; en: string; ready: boolean }

const PROGRAMS: Program[] = [
  { key: 'ski', title: '스키·스노보드', en: 'Ski & Snowboard', ready: true },
  { key: 'tennis', title: '테니스', en: 'Tennis', ready: false },
  { key: 'windsurf', title: '윈드서핑', en: 'Windsurfing', ready: false },
  { key: 'rehab', title: '운동처방', en: 'Exercise Rx', ready: false },
]

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

// 유형별 폼 본문 — 직무=신청 폼 / 자율=준비중.
function trackBody(key: string) {
  if (key === 'jikmu') return <JikmuApplyForm />
  return (
    <WhiteBox className="p-6">
      <Text variant="body">자율패키지 신청 폼은 준비 중입니다. 직무연수부터 순차 오픈됩니다.</Text>
    </WhiteBox>
  )
}

// 준비중 프로그램 패널 — 우 상세/모바일 모달 공용.
function PendingPanel({ title }: { title: string }) {
  return (
    <div className="flex items-center justify-center rounded-[10px] border border-[#e5eaef] py-10" style={{ background: '#f2f5f9' }}>
      <span className="font-score text-[clamp(0.6875rem,2.6cqi,0.8125rem)] font-[500] text-[#9ca3af]">{title} 연수는 준비 중입니다.</span>
    </div>
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
          <span className="block font-score text-[clamp(0.75rem,2.9cqi,0.90625rem)] font-[500] text-[#1e3a5f]">{track.title}</span>
          <span className="mt-0.5 block font-score text-[clamp(0.625rem,2.4cqi,0.75rem)] font-[400] text-[#6b7280]">{track.spec}</span>
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
      <span className="font-score text-[clamp(0.6875rem,2.6cqi,0.8125rem)] font-[500] text-[#9ca3af]">준비중</span>
    </button>
  )
}

// 프로그램 탭(층1) — 4열 박스 그리드. 선택 시 네이비 틴트. 4종 모두 클릭 가능.
function ProgramTabs({ active, onSelect }: { active: string; onSelect: (k: string) => void }) {
  return (
    <div className="mb-5 grid grid-cols-4 gap-2">
      {PROGRAMS.map((p) => {
        const on = p.key === active
        return (
          <button
            key={p.key}
            type="button"
            onClick={() => onSelect(p.key)}
            aria-selected={on}
            className="rounded-[10px] border px-2 py-2.5 text-center font-score text-[clamp(0.6875rem,2.6cqi,0.8125rem)] font-[500] transition-colors"
            style={{
              borderColor: on ? NAVY : '#e5eaef',
              background: on ? NAVY : '#f2f5f9',
              color: on ? '#ffffff' : '#8a94a0',
            }}
          >
            {p.title}
          </button>
        )
      })}
    </div>
  )
}

// 최초 진입 안내 — 프로그램·유형 선택 전, 폼 자리에 노출.
function GuideBox() {
  return (
    <div className="flex items-center justify-center rounded-[10px] border border-dashed border-[#d7dee6] py-12 px-6 text-center" style={{ background: '#f7f9fb' }}>
      <Text variant="sub" className="text-[#8a94a0]">
        신청할 프로그램과 유형을 선택하시면<br />해당 신청 폼이 이곳에 나타납니다.
      </Text>
    </div>
  )
}

type Modal = { kind: 'form'; key: string } | { kind: 'pending'; title: string }

export default function ApplyPage() {
  const [isMobile, setIsMobile] = useState(false)
  const [program, setProgram] = useState('ski') // 층1 (기본 스키)
  const [type, setType] = useState('') // 층2 — 최초 진입 미선택(폼 대신 안내박스)
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
      <ProgramTabs active={program} onSelect={setProgram} />
      {activeProgram.ready ? (
        <div>
          <div className="mb-5 grid grid-cols-2 gap-3">
            {TRACKS.map((t) => (
              <TrackCard key={t.key} track={t} compact selected={type === t.key} onSelect={() => setType(t.key)} />
            ))}
          </div>
          {type ? trackBody(type) : <GuideBox />}
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
        <Modal onClose={() => setModal(null)}>
          {modal.kind === 'form' ? trackBody(modal.key) : <PendingPanel title={modal.title} />}
        </Modal>
      )}
    </>
  )
}
