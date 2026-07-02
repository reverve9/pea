'use client'

import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Plus, Check, GraduationCap, Boxes, X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { useIsMobile } from '@/lib/useIsMobile'

// /courses 연수 유형 — 계획안(연수비용 및 포함사항) 4개 유형을 공개용으로 큐레이션.
// 모바일 드롭다운(아코디언): 헤더(유형명+일정+학점) 클릭 → 포함사항 체크리스트 + 비용을 회색 패널로.
// 넣기/빼기 기준(확정): 유형명·일정·학점·포함사항(숙박·리프트+렌탈·식음·강습)·비용 ✅ /
//   추가렌탈·인원별매수·평형·시간대 세부·비고(신청대상=개요 중복) ❌.
// ⚠ 수치는 계획안 0630 원안(후속 DB 연동 전 하드코딩). 직무=네이비 / 자율=포레스트그린.

const NAVY = '#1e3a5f'
const GREEN = '#2f803a'

// 비용 항목 — [라벨, 값, 하위줄?](예: 개별객실 → 303,000원 / +평형별 추가요금)
type Price = [label: string, value: string, sub?: string]

// 세부사항 아이템 — 단순 문자열 또는 라벨+부가정보(하위줄 sub·주석 note·행 rows)
interface IncludeDetail {
  label: string
  sub?: string // 하위 한 줄(예: 1일차 오후~3일차 오전)
  note?: string // *주석(예: 야간권 포함)
  rows?: { name: string; desc: string }[] // 표형(예: 숙박 → 단체/개별객실)
  grid?: { name: string; price: string }[] // 2×2 항목·가격(예: 추가렌탈 선택사항)
}
type IncludeItem = string | IncludeDetail

// 추가렌탈(선택사항) — 4개 패키지 전부 동일해서 상수 하나로(각 패키지 세부 끝에 반복 노출).
const ADDON_RENTAL: IncludeDetail = {
  label: '추가렌탈 (선택사항)',
  grid: [
    { name: '스키복(상하의)', price: '30,000원' },
    { name: '고글', price: '20,000원' },
    { name: '보호대', price: '20,000원' },
    { name: '장갑 구매', price: '15,000원' },
  ],
}

interface CourseType {
  key: string
  name: string
  variant?: string // 베이스명과 차별화할 괄호 표기(예: 주말 2박)
  icon: LucideIcon // 신청 페이지와 동일 아이콘(직무=GraduationCap / 자율=Boxes)
  schedule: string
  credit: string
  accent: string
  includes: IncludeItem[]
  prices: Price[]
}

// 자율 3종 공통 세부 — 리프트 박수권·일정·조식 매수만 다르므로 파라미터로.
// 조식: 박수만큼 지급(2박=2매 / 1박=1매, 1인당).
const jayulIncludes = (liftTerm: string, liftTime: string, breakfast: number): IncludeItem[] => [
  { label: '숙박', sub: '22평(1~4인) · 33평(5~6인)' },
  { label: `리프트권 ${liftTerm}`, sub: liftTime, note: '야간권 포함' },
  { label: '조식 뷔페 입장권', sub: `1인당 ${breakfast}매` },
  '기초 단체 강습 1회',
  ADDON_RENTAL,
]

const TYPES: CourseType[] = [
  {
    key: 'jikmu',
    name: '직무연수',
    icon: GraduationCap,
    schedule: '2박 3일',
    credit: 'NEIS 1학점 인정',
    accent: NAVY,
    includes: [
      {
        label: '숙박',
        rows: [
          { name: '단체객실', desc: '22평(4인) · 33평(6인)' },
          { name: '개별객실', desc: '22평(희망정원) · 33평(희망정원)' },
        ],
      },
      { label: '리프트권 2박3일권', sub: '(1일차 오후~3일차 오전)', note: '야간권 포함' },
      { label: '단체식 3회', sub: '(1일차 석, 2일차 중·석식)' },
      { label: '수준별 강습 4타임', sub: '(1일차 오후+야간, 2일차 오전+오후)' },
      ADDON_RENTAL,
    ],
    prices: [
      ['단체객실', '303,000원'],
      ['개별객실', '303,000원', '+ 평형별 추가요금'],
    ],
  },
  {
    key: 'weekend_2n',
    name: '자율패키지',
    variant: '주말 2박',
    icon: Boxes,
    schedule: '2박 3일',
    credit: '학점 미인정',
    accent: GREEN,
    includes: jayulIncludes('2박3일권', '(1일차 오후~3일차 오전)', 2),
    prices: [
      ['1인', '472,000원'],
      ['2인', '700,000원'],
      ['3인', '928,000원'],
      ['4인', '1,156,000원'],
      ['5인', '1,445,000원'],
      ['6인', '1,734,000원'],
    ],
  },
  {
    key: 'weekend_1n',
    name: '자율패키지',
    variant: '주말 1박',
    icon: Boxes,
    schedule: '1박 2일',
    credit: '학점 미인정',
    accent: GREEN,
    includes: jayulIncludes('1박2일권', '(1일차 오후~2일차 오전)', 1),
    prices: [
      ['1인', '300,500원'],
      ['2인', '479,000원'],
      ['3인', '657,500원'],
      ['4인', '836,000원'],
      ['5인', '1,045,000원'],
      ['6인', '1,254,000원'],
    ],
  },
  {
    key: 'weekday_2n',
    name: '자율패키지',
    variant: '주중 2박',
    icon: Boxes,
    schedule: '2박 3일',
    credit: '학점 미인정',
    accent: GREEN,
    includes: jayulIncludes('2박3일권', '(1일차 오후~3일차 오전)', 2),
    prices: [
      ['1인', '437,500원'],
      ['2인', '665,000원'],
      ['3인', '892,500원'],
      ['4인', '1,120,000원'],
      ['5인', '1,400,000원'],
      ['6인', '1,680,000원'],
    ],
  },
]

// 유형 헤더 — 아이콘 칩 + 이름 + 일정·학점. as='button'(모바일 시트 트리거) / as='div'(데스크탑 정적)
function TypeHeader({ t, onClick }: { t: CourseType; onClick?: () => void }) {
  const inner = (
    <>
      {/* 아이콘 칩 — 신청 페이지 아이콘 + 유형 색. 직무/자율 색 구분은 여기에. */}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ background: t.accent + '14' }}
      >
        <t.icon size={18} strokeWidth={1.75} style={{ color: t.accent }} />
      </span>
      <span className="min-w-0 flex-1">
        {/* 제목 텍스트는 네이비 통일 — 색 구분은 아이콘 칩으로만 */}
        <span className="block font-score text-[14.5px] font-[500] text-[#1e3a5f]">
          {t.name}
          {t.variant && (
            <span className="ml-1 text-[13.5px] font-[400] text-[#4b5563]">({t.variant})</span>
          )}
        </span>
        <span className="mt-0.5 block font-score text-[12px] font-[300] text-[#9ca3af]">
          {t.schedule} · {t.credit}
        </span>
      </span>
    </>
  )

  // 데스크탑 정적 헤더(토글 없음)
  if (!onClick) {
    return <div className="flex items-center gap-3 px-4 py-3">{inner}</div>
  }
  // 모바일 모달 트리거 — 우측 Plus(열기/더보기 관용, 아코디언 느낌 안 남). 카드 전체가 탭 타깃.
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center gap-3 px-4 py-3 text-left"
    >
      {inner}
      <Plus size={17} className="shrink-0 text-[#9ca3af]" />
    </button>
  )
}

// 유형 상세(세부사항 + 비용) — 데스크탑 인라인 패널 / 모바일 바텀시트 공용
function TypeDetail({ t }: { t: CourseType }) {
  return (
    <>
      <p className="mb-2 font-score text-[12px] font-[500]" style={{ color: t.accent }}>
        세부사항
      </p>
      <ul className="space-y-1.5">
        {t.includes.map((item, i) => (
          <li key={i} className="flex items-start gap-2">
            <Check size={14} className="mt-[3px] shrink-0" style={{ color: t.accent }} />
            {typeof item === 'string' ? (
              <span className="font-score text-[13px] font-[300] leading-relaxed text-[#374151]">
                {item}
              </span>
            ) : (
              <div className="min-w-0 flex-1">
                <span className="font-score text-[13px] font-[300] text-[#374151]">{item.label}</span>
                {item.rows && (
                  <div className="mt-1 space-y-1">
                    {item.rows.map((r) => (
                      <div key={r.name} className="flex gap-2">
                        <span className="w-[54px] shrink-0 font-score text-[12px] font-[400] text-[#9ca3af]">
                          {r.name}
                        </span>
                        <span className="font-score text-[12.5px] font-[300] text-[#4b5563]">
                          {r.desc}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                {item.sub && (
                  <span className="mt-0.5 block font-score text-[12px] font-[300] text-[#8a94a0]">
                    {item.sub}
                  </span>
                )}
                {item.note && (
                  <span className="block font-score text-[11.5px] font-[300] text-[#9ca3af]">
                    * {item.note}
                  </span>
                )}
                {item.grid && (
                  <div className="mt-1.5 grid grid-cols-2 gap-x-5 gap-y-1">
                    {item.grid.map((g) => (
                      <div key={g.name} className="flex items-baseline justify-between gap-2">
                        <span className="font-score text-[12px] font-[300] text-[#6b7280]">
                          {g.name}
                        </span>
                        <span className="font-score text-[12px] font-[500] tabular-nums text-[#4b5563]">
                          {g.price}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
      </ul>

      <div className="mt-4 border-t border-[#e5eaef] pt-3">
        <p className="mb-2 font-score text-[12px] font-[500]" style={{ color: t.accent }}>
          비용
        </p>
        <div className="grid grid-cols-2 gap-x-8 gap-y-1.5">
          {t.prices.map(([label, value, sub]) => (
            <div key={label} className="flex items-start justify-between gap-2">
              <span className="font-score text-[12.5px] font-[300] leading-tight text-[#6b7280]">
                {label}
              </span>
              <span className="text-right">
                <span className="block font-score text-[13px] font-[500] tabular-nums text-[#374151]">
                  {value}
                </span>
                {sub && (
                  <span className="mt-0.5 block font-score text-[11px] font-[300] text-[#9ca3af]">
                    {sub}
                  </span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  )
}

// 중앙 팝업 모달 — 좌우 여백 + 은은하게 비치는 오버레이(옅은 딤 + 살짝 블러). Portal로 body 탈출.
function CenterModal({ t, onClose }: { t: CourseType; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
    >
      {/* 오버레이 — 뒷배경 은은하게 비치게(옅은 딤 + 소프트 블러) */}
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0 bg-[#0f1b2e]/25 backdrop-blur-[2px]"
      />
      {/* 팝업 */}
      <div className="relative z-10 flex max-h-[80vh] w-full max-w-[400px] flex-col overflow-hidden rounded-[14px] bg-white shadow-[0_16px_48px_rgba(15,27,46,0.22)]">
        {/* 헤더 */}
        <div className="flex items-center gap-3 border-b border-[#eef1f4] px-5 py-4">
          <span
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
            style={{ background: t.accent + '14' }}
          >
            <t.icon size={20} strokeWidth={1.75} style={{ color: t.accent }} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-score text-[15.5px] font-[500] text-[#1e3a5f]">
              {t.name}
              {t.variant && (
                <span className="ml-1 text-[13.5px] font-[400] text-[#4b5563]">({t.variant})</span>
              )}
            </p>
            <p className="mt-0.5 font-score text-[12px] font-[300] text-[#9ca3af]">
              {t.schedule} · {t.credit}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="shrink-0 rounded-full p-1 text-[#9ca3af] hover:bg-[#f1f5f9]"
          >
            <X size={18} />
          </button>
        </div>
        {/* 본문 */}
        <div className="overflow-y-auto px-5 py-4">
          <TypeDetail t={t} />
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function CourseTypes() {
  const isMobile = useIsMobile()
  const [selected, setSelected] = useState<string | null>(null)

  // 모바일 — 행 탭 → 중앙 팝업 모달. 아코디언 인라인 없음.
  if (isMobile) {
    const sel = TYPES.find((t) => t.key === selected) ?? null
    return (
      <>
        <div className="space-y-2">
          {TYPES.map((t) => (
            <div key={t.key} className="rounded-[10px] border border-[#e5eaef] bg-[#f2f5f9]">
              <TypeHeader t={t} onClick={() => setSelected(t.key)} />
            </div>
          ))}
        </div>
        {sel && <CenterModal t={sel} onClose={() => setSelected(null)} />}
      </>
    )
  }

  // 데스크탑 — 아코디언 불필요(비교 대상 아님, 일정으로 고르는 것). 4개 유형 상세를 펼쳐 노출.
  return (
    <div className="space-y-2">
      {TYPES.map((t) => (
        <div key={t.key} className="overflow-hidden rounded-[10px] border border-[#e5eaef] bg-[#f2f5f9]">
          <TypeHeader t={t} />
          <div className="border-t border-[#e5eaef] px-4 py-4">
            <TypeDetail t={t} />
          </div>
        </div>
      ))}
    </div>
  )
}
