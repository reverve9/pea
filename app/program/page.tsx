'use client'

import { useState } from 'react'
import Link from 'next/link'
import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import SectionTitle from '@/components/common/SectionTitle'
import MasterCard from '@/components/common/MasterCard'
import ExtendedHeader from '@/components/layout/ExtendedHeader'
import Text, { BTN } from '@/components/common/Text'
import { Activity, Users, ShieldCheck } from 'lucide-react'
import { ProgramTabs, PendingPanel } from '@/components/features/ProgramTabs'
import DuotoneHero from '@/components/features/DuotoneHero'
import { PROGRAMS, OPEN_PROGRAMS } from '@/lib/programs'

// §프로그램 — 종목(층1) "소개" 페이지. 셸 = /courses 정본 미러링(좌 마스터 / 우 상세, 탭은 모바일+우 상단).
// 역할: 좌측 마스터 카드 = 제목 + 요약 desc(card-sub) / 우측 페인 = 히어로 + 과정소개 + 핵심목표(인포그래픽) + 세부 커리큘럼.
// ⚠ 콘텐츠(desc·intro·goals·curriculum)는 전부 클라이언트 확정 카피. 없는 내용 창작 금지 — 텍스트 그대로.
const NAVY = '#1e3a5f'
const CYAN = '#2f8ba0'

// 좌 마스터 카드 요약 desc 폰트 — 연수안내 유형카드 desc(card-sub)에서 한 단계 업(12→13px) + 줄간격 확대.
const DESC_CLS = 'font-score text-[clamp(0.75rem,3.3cqi,0.8125rem)] font-[300] leading-relaxed text-[#1f2937]'

// 프로그램 상세(우측 페인 / 모바일) + 좌 카드 요약. 현재 스키만 운영. ⚠ 전부 클라이언트 확정 카피(줄바꿈 유지).
const PROGRAM_DETAIL: Record<
  string,
  {
    cardDesc: React.ReactNode // 좌 마스터 카드 요약(줄바꿈 그대로)
    heroEyebrow: string
    heroTitle: string
    heroImgs?: string[] // 히어로 실사(1~2장). 2장이면 사선 블렌드. 없으면 그라디언트 폴백.
    heroTint?: number // 네이비 듀오톤 오버레이 오퍼시티(자연 풀컬러 0.3~0.4 / 베이크 듀오톤 0)
    intro: React.ReactNode // 과정 소개 단락
    goals: { title: string; desc: string }[] // 연수 핵심 목표(데스크탑 원형 카드 / 모바일 가로 박스)
  }
> = {
  ski: {
    cardDesc: (
      <>
        스키·스노보드 연수는 현장에서 바로 쓰는 실기를 중심으로<br />
        교원의 지도 역량을 키우는 서울시교육청 지정 특수분야 직무연수입니다.<br />
        이수 시 NEIS 학점이 인정됩니다.
      </>
    ),
    heroEyebrow: 'SKI & SNOWBOARD',
    heroTitle: '커리큘럼과 반 편성을 확인하세요',
    // 히어로 = 단일 합성(2:1). 홈 개념대로 스노보드=네이비 톤(좌)·스키=그린 톤(우)을 사선 블렌드로 베이크.
    // 없으면 네이비 그라디언트 폴백. 재베이크: _DEV/bake_hero.py (소스=_DEV/참고이미지/그라데이션 · 출력=public/program).
    heroImgs: ['/program/hero.jpg'],
    heroTint: 0,
    intro: (
      <>
        스키와 스노보드는 교원의 체육활동 참여를 확대하고, 신체적·정신적 건강 증진을 도모할 수 있는 대표적인 동계 스포츠입니다.
        본 연수 과정은 종목별 기초 및 실기 능력 향상은 물론, 학교 현장에서 즉각적으로 적용할 수 있는 지도 역량과 안전관리 능력 함양에
        중점을 둡니다. 현장 중심의 실습 교육을 통해 교원들이 보다 안전하고 효과적인 체육활동을 운영할 수 있도록 체계적으로 지원합니다.
      </>
    ),
    goals: [
      { title: '현장 중심 실습 교육', desc: '기초 기능·실기 능력 단계별 향상' },
      { title: '지도 역량 강화', desc: '학교 스포츠활동 전문 지도법 습득' },
      { title: '안전관리 능력 함양', desc: '안전사고 예방·위기 대처 능력 확보' },
    ],
  },
}

// 프로그램 세부 커리큘럼 — 종목별(스키/스노보드) 반 편성. 반명·대상·교육목표는 클라이언트 확정 카피.
const CURRICULUM: Record<string, { sport: string; classes: { level: string; target: string; goal: string }[] }[]> = {
  ski: [
    {
      sport: '스키',
      classes: [
        { level: '입문반', target: '첫 입문자', goal: '스키 착용법, 지상 강습, 스노우플라우턴 교육 목표' },
        { level: '초급반', target: '1회~3회 경험자', goal: '스노우 플라우턴, 슈템턴 교육 목표' },
        { level: '중상급반', target: '중급 이상 슬로프에서 자유로운 턴이 가능', goal: '베이직롱턴(패러렐)과 숏턴 교육 목표' },
      ],
    },
    {
      sport: '스노보드',
      classes: [
        { level: '입문반', target: '첫 입문자', goal: '스노보드 착용법, 지상 강습, 사이드슬리핑, 펜줄럼(낙엽) 교육 목표' },
        { level: '초급반', target: '1회~3회 경험자', goal: '펜줄럼(낙엽), 비기너턴 교육 목표' },
        { level: '중상급반', target: '중급 이상 슬로프에서 자유로운 턴이 가능', goal: '너비스턴, 보드 컨트롤 교육 목표' },
      ],
    },
  ],
}

// 데스크탑 좌측 단일 마스터 — 종목(층1) 카드. 제목 + 요약 desc, 선택 시 우측 상세 갱신.
// CourseProgramMaster 헤더 스타일 계승(배경 하이라이트만). 준비중은 캡션.
function ProgramMaster({ active, onSelect }: { active: string; onSelect: (k: string) => void }) {
  return (
    <div className="space-y-6">
      {OPEN_PROGRAMS.map((p) => {
        const on = p.key === active
        const d = PROGRAM_DETAIL[p.key]
        return (
          <MasterCard key={p.key} selected={on} onClick={() => onSelect(p.key)} className="p-4">
            <div className="flex items-center gap-3">
              <Text variant="card-title" as="span" className="min-w-0 flex-1">{p.title}</Text>
              {!p.ready && <Text variant="caption" as="span" className="shrink-0 text-[#9ca3af]">준비중</Text>}
            </div>
            {p.ready && d && <p className={`mt-1.5 ${DESC_CLS}`}>{d.cardDesc}</p>}
          </MasterCard>
        )
      })}
    </div>
  )
}

// 연수 핵심 목표 — 아이콘 카드 3열 그리드(순서 무관 동등 3축). 참고: _DEV/참고이미지/스크린샷 2026-07-07 오전 9.20.14.png.
// 연수 핵심 목표(동등 3축) — 데스크탑=원형 카드 3열(중앙 스택) / 모바일=가로 긴 박스 3행(아이콘 좌 + 텍스트).
// 흰 바탕·진한 그림자로 돋보이게. 참고: _DEV/참고이미지/스크린샷 2026-07-07 오전 9.20.14.png.
const GOAL_ICONS = [Activity, Users, ShieldCheck] // 실습교육 / 지도역량 / 안전관리 — 순서 무관(동등 3축)

function ProgramGoals({ goals }: { goals: { title: string; desc: string }[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-7">
      {goals.map((g, i) => {
        const Icon = GOAL_ICONS[i] ?? Activity
        return (
          <div
            key={i}
            // 모바일=가로 긴 박스(아이콘 좌 + 텍스트) / 데스크탑=원형 카드(중앙 세로 스택)
            className="flex items-center gap-4 rounded-[14px] bg-white p-5 shadow-[0_2px_6px_rgba(0,0,0,0.07),0_16px_36px_-12px_rgba(0,0,0,0.30)] md:mx-auto md:aspect-square md:w-full md:max-w-[210px] md:flex-col md:justify-center md:gap-3 md:rounded-full md:px-6 md:text-center"
          >
            {/* 의미 아이콘 (원형 칩) */}
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#eaf3f6]">
              <Icon size={18} strokeWidth={1.75} className="text-[#2f8ba0]" />
            </span>
            {/* 목표명 + 설명 (모바일 우측 컬럼 / 데스크탑 아이콘 아래) */}
            <div className="min-w-0">
              <Text variant="card-title" as="p">{g.title}</Text>
              <Text as="p" variant="sub" className="mt-1 break-keep text-balance md:mt-1.5">{g.desc}</Text>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// 세부 커리큘럼 — 종목별(스키/스노보드) 반 편성.
function ProgramCurriculum({ programKey }: { programKey: string }) {
  const groups = CURRICULUM[programKey]
  return (
    <div>
      <SectionTitle title="세부 커리큘럼" />
      {groups?.length ? (
        <div className="space-y-6">
          {groups.map((g) => (
            <div key={g.sport}>
              {/* 종목 소그룹 헤더 — 시안 액센트로 반 항목(네이비)과 위계 구분. */}
              <Text as="p" variant="card-title-sm" color={CYAN} className="mb-1">{g.sport}</Text>
              <ul>
                {g.classes.map((c) => (
                  <li key={c.level} className="border-b border-[#eaeef3] py-3 last:border-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <Text variant="card-title-sm" as="span">{c.level}</Text>
                      <Text variant="caption" as="span" className="text-[#9ca3af]">({c.target})</Text>
                    </div>
                    <Text as="p" variant="sub" className="mt-1">{c.goal}</Text>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <div className="flex items-center justify-center rounded-[10px] border border-dashed border-[#d7dee6] px-6 py-12 text-center" style={{ background: '#f7f9fb' }}>
          <Text variant="sub" className="text-[#8a94a0]">세부 커리큘럼 항목이 들어갈 자리입니다.</Text>
        </div>
      )}
    </div>
  )
}

// 우측 페인 / 모바일 공용 상세 — 히어로 + 과정소개 + 핵심목표(인포그래픽) + 세부 커리큘럼 + CTA.
function ProgramDetail({ programKey }: { programKey: string }) {
  const d = PROGRAM_DETAIL[programKey]
  return (
    <div>
      {d && (
        <>
          <DuotoneHero eyebrow={d.heroEyebrow} title={d.heroTitle} imgs={d.heroImgs} tint={d.heroTint} />
          <p className="mb-20 font-score text-[clamp(0.875rem,3.3cqi,1rem)] font-[300] leading-[1.9] text-[#4b5563]">
            {d.intro}
          </p>
          <section className="mb-20">
            <SectionTitle title="연수 핵심 목표" />
            <ProgramGoals goals={d.goals} />
          </section>
        </>
      )}
      <ProgramCurriculum programKey={programKey} />

      {/* 소개(프로그램) → 액션(연수안내: 일정·유형·신청) */}
      <Link
        href="/courses"
        className={`${BTN} mt-12 flex items-center justify-center rounded-[8px] py-3 text-white transition-[filter] hover:brightness-95`}
        style={{ background: NAVY }}
      >
        연수 일정·유형 보기
      </Link>
    </div>
  )
}

export default function ProgramPage() {
  const [program, setProgram] = useState('ski') // 층1(기본 스키). 준비중 3종 선택 시 PendingPanel.
  const activeProgram = PROGRAMS.find((p) => p.key === program) ?? PROGRAMS[0]

  return (
    <AppShell
      main={
        <div className="pb-[60px]">
          <PageTitle title="프로그램" en="PROGRAM" />

          {/* 페이지 도입 — 종목(층1) 선택 안내. */}
          <p className="px-4 pt-1 pb-8 text-center font-score text-[clamp(0.9375rem,3.4cqi,1.0625rem)] font-[300] leading-[1.85] text-[#4b5563]">
            체육교육회가 운영하는 <span className="font-[500] text-[#1e3a5f]">연수 프로그램</span>을 소개합니다.<br />
            종목을 선택해 세부 커리큘럼을 확인하세요.
          </p>

          {/* 데스크탑 좌측 단일 마스터 — 종목 카드(요약 desc), 우측 상세 제어. 탭 아님. */}
          <section className="hidden px-4 md:block">
            <SectionTitle title="종목" rail />
            <ProgramMaster active={program} onSelect={setProgram} />
          </section>

          {/* 모바일 — 종목 탭(층1) + 상세(우 확장 페인 대체: 히어로+소개+핵심목표+커리큘럼). */}
          <div className="px-4 md:hidden">
            <ProgramTabs active={program} onSelect={setProgram} />
            {activeProgram.ready ? (
              <ProgramDetail programKey={activeProgram.key} />
            ) : (
              <PendingPanel title={activeProgram.title} />
            )}
          </div>
        </div>
      }
      extended={
        <div className="pb-[60px]">
          <ExtendedHeader title="프로그램" eyebrow="PROGRAM" />
          {/* 우측 상단 탭 제거 — 히어로 도입 + 좌측 마스터가 종목 선택 담당(중복 제거). */}
          {/* 우측 = 히어로 + 과정소개 + 핵심목표 + 세부 커리큘럼(요약 desc는 좌측 마스터 카드). */}
          {activeProgram.ready ? (
            <ProgramDetail programKey={activeProgram.key} />
          ) : (
            <PendingPanel title={activeProgram.title} />
          )}
        </div>
      }
    />
  )
}
