'use client'

import React, { useState } from 'react'
import SectionTitle from '@/components/common/SectionTitle'
import Text from '@/components/common/Text'

// /courses 연수 개요 — 클라이언트 계획안(연수 계획 · 연수 개요 ①) 내용을 우리 디자인 시스템으로 재구성.
// 스크린샷의 노랑/초록 raw 목업 스타일은 버리고 내용만 이식(네이비·시안·font-score).
// ⚠ 문의 이메일/전화는 placeholder(후속 site_settings 연동). 장소·대상·인정 수치는 원안 확정값.
// 직무/자율 색 코드 = 홈 듀오톤과 동일(직무=네이비 #1e3a5f / 자율=포레스트그린 #2f803a).

const NAVY = '#1e3a5f'
const GREEN = '#2f803a'

// 연수 개요 — 정의 목록(라벨 2글자 통일)
const FACTS: { label: string; value: string; sub?: string; url?: string }[] = [
  { label: '기관', value: '체육교육회' },
  { label: '문의', value: 'info@pea.or.kr · 02-000-0000' },
  {
    label: '장소',
    value: '알펜시아 리조트',
    sub: '강원 평창군 대관령면 솔봉로 325',
    url: 'http://www.alpensia.com',
  },
]

// 연수 구분 — 직무 vs 자율 2카드
const TYPES: {
  type: string
  accent: string
  target: string
  targetNote?: string
  credit: React.ReactNode
}[] = [
  {
    type: '직무연수',
    accent: NAVY,
    target: '전국 교원 및 교육전문직',
    targetNote: '기간제 교사 포함',
    credit: (
      <>
        연수시간 <span className="font-[500] text-[#1e3a5f]">15시간</span> · 학점{' '}
        <span className="font-[500] text-[#1e3a5f]">1학점</span> ·{' '}
        <span className="font-[500] text-[#1e3a5f]">NEIS</span> 등재
      </>
    ),
  },
  {
    type: '자율패키지',
    accent: GREEN,
    target: '교원·공무원 및 그 가족·지인',
    targetNote: '미성년자는 부모 동반 신청 필수',
    credit: <span className="text-[#9ca3af]">해당사항 없음</span>,
  },
]

// 패키지 본문(연수대상·연수인정) — 모바일 탭 패널 / 데스크탑 2열 카드 공용
function PackageBody({ t }: { t: (typeof TYPES)[number] }) {
  return (
    <>
      <div className="mb-3">
        <Text as="p" variant="label" className="mb-1">연수대상</Text>
        <Text as="p" variant="body">
          {t.target}
          {t.targetNote && (
            <Text as="span" variant="caption" className="block">* {t.targetNote}</Text>
          )}
        </Text>
      </div>
      <div>
        <Text as="p" variant="label" className="mb-1">연수인정</Text>
        <Text as="p" variant="body">{t.credit}</Text>
      </div>
    </>
  )
}

export default function CourseOverview() {
  const [active, setActive] = useState(0)

  return (
    // 현행 유지: 타이틀은 카드 밖(카드 안에 넣으면 달력처럼 내부 박스가 있는 섹션은 카드-속-카드 중복 발생).
    // 배경만 메인(흰색)보다 한 톤 진한 회색으로 → figure-ground 분리.
    <div>
      <SectionTitle title="개요" />
      <div className="overflow-hidden rounded-[10px] border border-[#e5eaef] bg-[#f2f5f9]">
        {/* 공통사항 — 기관명·문의·연수장소 */}
        <dl className="space-y-3 p-4">
          {FACTS.map((f) => (
            <div key={f.label} className="flex gap-3">
              <Text as="dt" variant="label" color="#2f8ba0" className="w-[42px] shrink-0 pt-[1px]">
                {f.label}
              </Text>
              <Text as="dd" variant="body">
                {f.value}
                {f.url && (
                  <Text as="span" variant="sub" color="#2f8ba0" className="ml-2">
                    {f.url}
                  </Text>
                )}
                {f.sub && (
                  <Text as="span" variant="sub" className="block">
                    {f.sub}
                  </Text>
                )}
              </Text>
            </div>
          ))}
        </dl>

        {/* 모바일 — 풀블리드 패키지 탭바(카드에 붙는 edge-to-edge, 활성만 솔리드 액센트 필) */}
        <div className="border-t border-[#eef1f4] md:hidden">
          <div className="flex" role="tablist">
            {TYPES.map((tt, i) => {
              const on = i === active
              return (
                <button
                  key={tt.type}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setActive(i)}
                  className="flex-1 py-2.5 font-score text-[13px] transition-colors duration-200"
                  style={
                    on
                      ? { background: tt.accent, color: '#ffffff', fontWeight: 500 }
                      : { color: '#8a93a0', fontWeight: 400 }
                  }
                >
                  {tt.type}
                </button>
              )
            })}
          </div>
          <div className="border-t border-[#eef1f4] p-4">
            <PackageBody t={TYPES[active]} />
          </div>
        </div>

        {/* 데스크탑 — 2열 유지 */}
        <div className="hidden border-t border-[#eef1f4] md:grid md:grid-cols-2">
          {TYPES.map((tt, i) => (
            <div key={tt.type} className={i === 0 ? 'border-r border-[#eef1f4] p-4' : 'p-4'}>
              <div className="mb-3 flex items-center gap-1.5">
                <span className="h-[13px] w-[3px] rounded-full" style={{ background: tt.accent }} />
                <span className="font-score text-[14px] font-[500]" style={{ color: tt.accent }}>
                  {tt.type}
                </span>
              </div>
              <PackageBody t={tt} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
