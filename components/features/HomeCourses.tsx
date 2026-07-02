'use client'

import React, { useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

// 홈 좌측 연수 코스 = 나인브릿지 홈 "2열 그리드 + 크로스 컬럼 확장" 이식:
// 좌 이미지 +클릭 → 직무 상세가 "우 이미지 위"에 오버레이(우에서 슬라이드), +→× 회전. 우 +는 자율 상세를 좌에.
// 상세 내용 = 계획서(0630) 10페이지 기준 + 시드 일정. pill + 라벨/값 스펙 구성.
// 값은 세그먼트 배열 → 각 세그먼트 nowrap 으로 "내용 단위 경계"에서만 줄바꿈(데스크탑 2줄도 깔끔).
// 주요 문장(카피·코스명)=S-Core Dream(font-score). 사이즈=데스크탑 max 기준 + cqi 로 모바일 클램프.
// TODO(이미지): public/home/ 사진 수급 후 img.
const JIKMU = {
  no: 'COURSE 01',
  name: '직무연수',
  desc: '전국 교원·교육전문직 · NEIS 학점 인정',
  accent: '#1e3a5f', // 진한 네이비
  pill: 'NEIS 학점 인정 · 이수증',
  pillClass: 'bg-[#e8edf3] text-[#1e3a5f]',
  rows: [
    { l: '신청대상', v: ['전국 교원 및 교육전문직', '(기간제 교사 포함)'] },
    { l: '과정', v: ['스키·스노보드 지도법', '현장 실습 (2박)'] },
    { l: '이수 혜택', v: ['출석 완료 시 NEIS 학점 등재 ·', '이수증 제공'] },
  ],
  img: '', // TODO /home/course-jikmu.jpg
  ph: 'from-[#2c3e57] to-[#16304f]',
}
const JAYUL = {
  no: 'COURSE 02',
  name: '자율패키지',
  desc: '교원 가족·지인 대상 자율 참여 패키지',
  accent: '#3f7d5a', // 그린
  pill: '패키지 할인가 · 학점 미인정',
  pillClass: 'bg-[#e8f2ea] text-[#3f7d5a]',
  rows: [
    { l: '신청대상', v: ['전국 교원·교육전문직,', '공무원 가족 및 지인'] },
    { l: '성격', v: ['가족·지인 대상 패키지 할인가', '(학점 인정 안 됨)'] },
    { l: '일정', v: ['주중2박 · 주말2박 · 주말1박', '중 자유 선택'] },
    { l: '참고', v: ['미성년자 부모 동반 신청 필수', '참가/납부 확인서 발행 가능'] },
  ],
  img: '', // TODO /home/course-jayul.jpg
  ph: 'from-[#3a7a5a] to-[#22463a]',
}

type Course = typeof JIKMU

function Bg({ c }: { c: Course }) {
  if (c.img) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={c.img} alt={c.name} className="absolute inset-0 w-full h-full object-cover object-center" />
  }
  return <div className={`absolute inset-0 bg-gradient-to-br ${c.ph}`} />
}

function PlusButton({ open, onClick, side, label }: { open: boolean; onClick: () => void; side: 'left' | 'right'; label: string }) {
  return (
    <button
      onClick={onClick}
      aria-expanded={open}
      aria-label={label}
      className={`absolute top-3 z-30 w-8 h-8 flex items-center justify-center ${side === 'right' ? 'right-3' : 'left-3'}`}
    >
      <span className="relative block w-6 h-6 transition-transform duration-300" style={{ transform: open ? 'rotate(45deg)' : 'rotate(0deg)' }}>
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[18px] h-[2.5px] bg-white rounded-sm" />
        <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[2.5px] h-[18px] bg-white rounded-sm" />
      </span>
    </button>
  )
}

function BaseLabel({ c }: { c: Course }) {
  return (
    <>
      <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/15 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 p-[clamp(0.875rem,4cqi,1.25rem)]">
        <p className="font-raleway text-[clamp(0.5625rem,2.4cqi,0.625rem)] font-[400] tracking-[2px] text-[#a9e0ea]">{c.no}</p>
        <h3 className="font-score text-[clamp(1.125rem,5.5cqi,1.375rem)] font-[500] text-white leading-tight mt-0.5">{c.name}</h3>
        <p className="text-[clamp(0.6875rem,3cqi,0.8125rem)] font-[300] text-white/85 leading-snug mt-1">{c.desc}</p>
      </div>
    </>
  )
}

// 값: 세그먼트별 nowrap → 내용 단위 경계에서만 줄바꿈
function Value({ segs }: { segs: string[] }) {
  return (
    <>
      {segs.map((seg, i) => (
        <React.Fragment key={i}>
          {i > 0 && ' '}
          <span className="whitespace-nowrap">{seg}</span>
        </React.Fragment>
      ))}
    </>
  )
}

// 상세 = 같은 컬럼 이미지 위 라이트 프로스트 + pill + 라벨/값 스펙 + 버튼
function Detail({ c, bg }: { c: Course; bg: Course }) {
  return (
    <>
      <Bg c={bg} />
      <div className="absolute inset-0 bg-white/92" />
      <div className="relative z-10 h-full flex flex-col p-[clamp(0.875rem,4cqi,1.25rem)]">
        <p className="font-raleway text-[clamp(0.5rem,2.2cqi,0.5625rem)] font-[400] tracking-[2px]" style={{ color: c.accent }}>{c.no}</p>
        <h3 className="font-score text-[clamp(1rem,4.8cqi,1.25rem)] font-[600] text-[#1e3a5f] leading-tight mt-0.5">{c.name}</h3>

        <span className={`self-start mt-2 px-2 py-0.5 rounded-full text-[clamp(0.625rem,2.7cqi,0.75rem)] font-[500] ${c.pillClass}`}>
          {c.pill}
        </span>

        <dl className="mt-2.5 space-y-2">
          {c.rows.map((r) => (
            <div key={r.l}>
              <dt className="text-[clamp(0.625rem,2.8cqi,0.75rem)] font-[600] tracking-[0.5px]" style={{ color: c.accent }}>{r.l}</dt>
              <dd className="text-[clamp(0.6875rem,3cqi,0.8125rem)] font-[300] text-[#374151] leading-snug mt-0.5">
                <Value segs={r.v} />
              </dd>
            </div>
          ))}
        </dl>

        <Link
          href="/courses"
          className="group/btn mt-auto flex items-center justify-between gap-2 rounded-lg bg-[#1e3a5f]/[0.06] px-4 py-2.5 text-[clamp(0.75rem,3.2cqi,0.875rem)] font-[500] text-[#1e3a5f] hover:bg-[#1e3a5f] hover:text-white transition-colors"
        >
          <span className="tracking-wide">연수안내 보기</span>
          <ArrowRight size={15} className="shrink-0 transition-transform duration-300 group-hover/btn:translate-x-0.5" />
        </Link>
      </div>
    </>
  )
}

export default function HomeCourses() {
  const [open, setOpen] = useState<'jikmu' | 'jayul' | null>(null)

  return (
    <section>
      {/* 카피 (이미지 위, S-Core Dream) */}
      <div className="px-[clamp(1.5rem,7cqi,2.75rem)] pt-[clamp(1.5rem,7cqi,2.5rem)] pb-[clamp(1.25rem,6cqi,2rem)]">
        <p className="font-score text-[clamp(1rem,4.6cqi,1.1875rem)] font-[300] text-[#374151] leading-relaxed">두 가지 방식으로,</p>
        <p className="font-score text-[clamp(1.0625rem,5cqi,1.3125rem)] font-[700] text-[#1e3a5f]">겨울 스포츠 지도 전문성을 시작하세요.</p>
      </div>

      {/* 2열 그리드 (크로스 컬럼 확장) */}
      <div className="grid grid-cols-2">
        {/* 좌 컬럼: 직무 이미지(기본) + 자율 상세(자율 눌리면 좌로 슬라이드) */}
        <div className="relative aspect-[3/5] overflow-hidden">
          <div className={`absolute inset-0 transition-opacity duration-300 ${open === 'jayul' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <Bg c={JIKMU} />
            <BaseLabel c={JIKMU} />
            <PlusButton open={open === 'jikmu'} side="right" label={`직무연수 상세 ${open === 'jikmu' ? '닫기' : '열기'}`} onClick={() => setOpen(open === 'jikmu' ? null : 'jikmu')} />
          </div>
          <div className={`absolute inset-0 transition-all duration-300 ${open === 'jayul' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-full pointer-events-none'}`}>
            <Detail c={JAYUL} bg={JIKMU} />
          </div>
        </div>

        {/* 우 컬럼: 자율 이미지(기본) + 직무 상세(직무 눌리면 우로 슬라이드) */}
        <div className="relative aspect-[3/5] overflow-hidden">
          <div className={`absolute inset-0 transition-opacity duration-300 ${open === 'jikmu' ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>
            <Bg c={JAYUL} />
            <BaseLabel c={JAYUL} />
            <PlusButton open={open === 'jayul'} side="left" label={`자율패키지 상세 ${open === 'jayul' ? '닫기' : '열기'}`} onClick={() => setOpen(open === 'jayul' ? null : 'jayul')} />
          </div>
          <div className={`absolute inset-0 transition-all duration-300 ${open === 'jikmu' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full pointer-events-none'}`}>
            <Detail c={JIKMU} bg={JAYUL} />
          </div>
        </div>
      </div>
    </section>
  )
}
