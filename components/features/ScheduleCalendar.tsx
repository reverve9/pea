'use client'

import React, { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { EmptyState } from '@/components/common/StateView'
import { SCHEDULE_TYPE, formatPeriod } from '@/lib/display'
import type { SessionWithCourse, ScheduleType } from '@/lib/types'

// §3-2 연수일정 달력 — 디자인 참고(8.13) 비주얼 + 실제 일정(8.15) 데이터.
// 원칙:
//  - 셀 안에 텍스트를 넣지 않는다(좁은 페인에서 truncate돼 지저분함). 셀엔 날짜만.
//  - 각 차수 기간 = 날짜 아래 컬러 바(샤프 사각형). 동시 진행 차수는 레인으로 스택(Gantt식).
//  - 색은 "타입별". 텍스트 정보는 하단 범례가 담당.
//  - 단일 월 뷰 + 상단 월 탭(세션 있는 달만). 표준 달력처럼 앞뒤 인접월 날짜를 흐리게 노출 →
//    월 경계 걸친 차수(1/31~2/2)가 1월 뷰에서도 잘리지 않고 이어져 보임. 차수 추가 시 탭 자동 증가.
//  - 바 클릭 → 해당 차수 상세(날짜·정원·신청) 카드 내부 섹션에 노출.

// 타입별 색 — 4유형 차별성·가독성 우선(쿨→웜으로 확실히 분리). 직무=네이비(CourseTypes 통일·앵커).
// export — 좌 월별 마스터(ScheduleMonthMaster)가 같은 색 언어(타입 칩) 재사용.
export const SCHEDULE_HEX: Record<ScheduleType, string> = {
  jikmu: '#1e3a5f', // 직무연수 — 네이비(플래그십, 가장 진함)
  weekday_2n: '#2f8fa8', // 주중 2박 — 틸(시안 계열, 네이비와 확실히 구분)
  weekend_2n: '#549a4e', // 주말 2박 — 그린
  weekend_1n: '#d18a3c', // 주말 1박 — 앰버
}

// 범례 전용 라벨 — 자율 3종은 상위 유형(자율PKG)을 명시해 정확히 구분(공유 SCHEDULE_TYPE 배지는 짧게 유지).
const LEGEND_LABEL: Record<ScheduleType, string> = {
  jikmu: '직무연수',
  weekday_2n: '자율PKG (주중2박)',
  weekend_2n: '자율PKG (주말2박)',
  weekend_1n: '자율PKG (주말1박)',
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']
const MS_WEEK = 7 * 24 * 3600 * 1000
const LANE_H = 11 // 바 한 레인의 세로 간격(px)

// 'YYYY-MM-DD' → 로컬 Date(0시)
function toDate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}
function addDays(dt: Date, n: number): Date {
  const r = new Date(dt)
  r.setDate(r.getDate() + n)
  return r
}
// 그 주의 일요일(주 시작)
function startOfWeek(dt: Date): Date {
  return addDays(dt, -dt.getDay())
}
const maxD = (...ds: Date[]): Date => ds.reduce((a, b) => (a.getTime() >= b.getTime() ? a : b))
const minD = (...ds: Date[]): Date => ds.reduce((a, b) => (a.getTime() <= b.getTime() ? a : b))

interface Segment {
  session: SessionWithCourse
  startCol: number // 0(일)~6(토)
  endCol: number
  lane: number
}
interface Week {
  days: Date[]
  segs: Segment[]
  laneCount: number
}

export interface CalMonth {
  y: number
  m: number
}

// 세션이 걸친 (year, month) 목록 — 월 경계 넘는 차수는 걸친 달마다 포함. 정렬됨.
// 좌 월별 마스터와 캘린더가 같은 인덱스를 공유하도록 export(둘 다 이 함수로 산출 → index 정합).
export function scheduleMonths(sessions: SessionWithCourse[]): CalMonth[] {
  const keys = new Map<string, CalMonth>()
  for (const s of sessions) {
    const start = toDate(s.starts_on)
    const end = toDate(s.ends_on)
    let cur = new Date(start.getFullYear(), start.getMonth(), 1)
    const endMonth = new Date(end.getFullYear(), end.getMonth(), 1)
    while (cur.getTime() <= endMonth.getTime()) {
      keys.set(`${cur.getFullYear()}-${cur.getMonth()}`, { y: cur.getFullYear(), m: cur.getMonth() })
      cur = new Date(cur.getFullYear(), cur.getMonth() + 1, 1)
    }
  }
  return [...keys.values()].sort((a, b) => a.y - b.y || a.m - b.m)
}

// 해당 (y, m) 달에 걸치는(구간이 겹치는) 세션 — 마스터의 "N개 차수"·타입칩 요약용.
export function sessionsInMonth(sessions: SessionWithCourse[], y: number, m: number): SessionWithCourse[] {
  const first = new Date(y, m, 1).getTime()
  const last = new Date(y, m + 1, 0).getTime()
  return sessions.filter((s) => {
    const st = toDate(s.starts_on).getTime()
    const en = toDate(s.ends_on).getTime()
    return st <= last && en >= first
  })
}

// monthIdx/onMonthChange 를 주면 controlled(좌 마스터가 월 제어), 안 주면 내부 상태(모바일 자체 탭).
// showMonthTabs=false → 상단 월 탭 숨김(데스크탑, 마스터가 제어) + 활성월 정적 헤더로 대체.
export default function ScheduleCalendar({
  sessions,
  monthIdx: monthIdxProp,
  onMonthChange,
  selectedId: selectedIdProp,
  onSelect,
  showMonthTabs = true,
}: {
  sessions: SessionWithCourse[]
  monthIdx?: number
  onMonthChange?: (i: number) => void
  selectedId?: string | null
  onSelect?: (id: string | null) => void
  showMonthTabs?: boolean
}) {
  const [monthIdxState, setMonthIdxState] = useState(0)
  const controlled = monthIdxProp !== undefined
  const monthIdx = controlled ? monthIdxProp : monthIdxState
  const setMonthIdx = (i: number) => {
    if (controlled) onMonthChange?.(i)
    else setMonthIdxState(i)
  }
  // 선택 차수(하단 상세 아코디언) — 제어형이면 부모(좌 마스터와 공유)가 소유, 아니면 내부 상태(모바일 단독).
  const [selectedIdState, setSelectedIdState] = useState<string | null>(null)
  const controlledSel = selectedIdProp !== undefined
  const selectedId = controlledSel ? selectedIdProp : selectedIdState
  const setSelectedId = (id: string | null) => {
    if (controlledSel) onSelect?.(id)
    else setSelectedIdState(id)
  }

  // 레인 정렬용 안정 정렬 + 세션이 걸친 (year, month) 목록(마스터와 공유하는 scheduleMonths 사용)
  const { ordered, months } = useMemo(() => {
    const ordered = [...sessions].sort(
      (a, b) => a.starts_on.localeCompare(b.starts_on) || a.sort_order - b.sort_order,
    )
    return { ordered, months: scheduleMonths(sessions) }
  }, [sessions])

  const idx = Math.min(monthIdx, Math.max(months.length - 1, 0))
  const activeMonth = months[idx]

  // 선택된 달의 주 그리드(앞뒤 인접월 날짜 포함 — 바는 그 셀까지 이어짐)
  const weeks: Week[] = useMemo(() => {
    if (!activeMonth) return []
    const { y, m } = activeMonth
    const gridStart = startOfWeek(new Date(y, m, 1))
    const weekCount =
      Math.round((startOfWeek(new Date(y, m + 1, 0)).getTime() - gridStart.getTime()) / MS_WEEK) + 1

    return Array.from({ length: weekCount }, (_, w) => {
      const days = Array.from({ length: 7 }, (_, i) => addDays(gridStart, w * 7 + i))
      const weekStart = days[0]
      const weekEnd = days[6]

      // 이 주에 걸치는 세션 → 세그먼트(주 경계로만 clamp = 인접월 오버플로 셀까지 노출)
      const segs: Segment[] = []
      for (const s of ordered) {
        const visStart = maxD(toDate(s.starts_on), weekStart)
        const visEnd = minD(toDate(s.ends_on), weekEnd)
        if (visStart.getTime() > visEnd.getTime()) continue
        segs.push({ session: s, startCol: visStart.getDay(), endCol: visEnd.getDay(), lane: 0 })
      }

      // 레인 배정(greedy) — 겹치면 아래 레인으로
      const laneEnd: number[] = []
      for (const seg of segs) {
        let lane = laneEnd.findIndex((end) => end < seg.startCol)
        if (lane === -1) {
          lane = laneEnd.length
          laneEnd.push(seg.endCol)
        } else {
          laneEnd[lane] = seg.endCol
        }
        seg.lane = lane
      }

      return { days, segs, laneCount: Math.max(laneEnd.length, 1) }
    })
  }, [activeMonth, ordered])

  // 월이 바뀌면 선택 바 해제 — 단, 제어형(좌 마스터가 월+선택을 함께 세팅)에선 선택 유지.
  useEffect(() => {
    if (!controlledSel) setSelectedIdState(null)
  }, [monthIdx, controlledSel])

  // 선택은 일시적 — 선택영역(달력 바 / 좌 마스터 차수) 밖을 클릭하면 해제 → 하단 상세 닫힘 + 달력 전역 활성 복귀.
  useEffect(() => {
    if (selectedId === null) return
    const onDocClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement
      if (!t.closest('[data-schedule-bar]') && !t.closest('[data-schedule-pick]')) setSelectedId(null)
    }
    document.addEventListener('click', onDocClick)
    return () => document.removeEventListener('click', onDocClick)
  }, [selectedId])

  const selected = sessions.find((s) => s.id === selectedId) ?? null
  // ⚠ 신청 인원은 후속 어드민 연동 전 placeholder(applied_count 없으면 0).
  const applied = selected
    ? ((selected as unknown as { applied_count?: number }).applied_count ?? 0)
    : 0
  const remaining = selected ? Math.max(selected.capacity - applied, 0) : 0

  if (sessions.length === 0 || !activeMonth) {
    return <EmptyState label="등록된 연수 일정이 없습니다." />
  }

  return (
    // 달력 자체가 카드박스(개요 카드와 동일 톤).
    <div className="overflow-hidden rounded-[10px] border border-[#e5eaef] bg-[#f2f5f9]">
      {/* 월 탭 — 세션 있는 달만. 직접 점프. showMonthTabs=false(데스크탑)면 좌 마스터가 제어하므로 정적 헤더로. */}
      {showMonthTabs ? (
        <div className="flex items-center gap-2 border-b border-[#e5eaef] px-3 py-1.5">
          <span className="font-score text-[12px] font-[400] tabular-nums text-[#9ca3af]">
            {activeMonth.y}
          </span>
          <div className="flex overflow-x-auto">
            {months.map((mo, i) => {
              const on = i === idx
              return (
                <button
                  key={`${mo.y}-${mo.m}`}
                  type="button"
                  onClick={() => setMonthIdx(i)}
                  className={`border-b-2 px-2.5 py-1 font-score text-[13px] font-[500] tabular-nums transition-colors ${
                    on
                      ? 'border-[#1e3a5f] text-[#1e3a5f]'
                      : 'border-transparent text-[#9ca3af] hover:text-[#6b7280]'
                  }`}
                >
                  {mo.m + 1}월
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="border-b border-[#e5eaef] px-4 py-2">
          <span className="font-score text-[13px] font-[500] tabular-nums text-[#1e3a5f]">
            {activeMonth.y}년 {activeMonth.m + 1}월
          </span>
        </div>
      )}

      {/* 요일 헤더 */}
      <div className="grid grid-cols-7 px-2 pt-2">
        {WEEKDAYS.map((w, i) => (
          <div
            key={w}
            className={`pb-1.5 text-center text-[clamp(0.75rem,0.71rem+0.22vw,0.8125rem)] font-[500] ${
              i === 0 ? 'text-[#c0685a]' : i === 6 ? 'text-[#5b7cae]' : 'text-[#9ca3af]'
            }`}
          >
            {w}
          </div>
        ))}
      </div>

      {/* 주별 행 */}
      <div className="px-2 pb-3">
        {weeks.map((week, wi) => (
          <div key={wi} className="border-t border-[#eceff3] first:border-t-0">
            {/* 날짜 숫자 — 인접월 날짜는 흐리게 */}
            <div className="grid grid-cols-7">
              {week.days.map((d, i) => {
                const inMonth = d.getMonth() === activeMonth.m && d.getFullYear() === activeMonth.y
                const color = !inMonth
                  ? 'text-[#c8ccd2]'
                  : i === 0
                    ? 'text-[#c0685a]'
                    : i === 6
                      ? 'text-[#5b7cae]'
                      : 'text-[#6b7280]'
                return (
                  <div
                    key={i}
                    className={`px-1 pt-1.5 text-right text-[clamp(0.75rem,0.71rem+0.22vw,0.8125rem)] tabular-nums ${color}`}
                  >
                    {d.getDate()}
                  </div>
                )
              })}
            </div>

            {/* 차수 바(레인 스택) — 절대배치, 컬럼 폭 기준 %. 샤프 사각형(라운드 없음). */}
            <div className="relative mt-0.5 mb-1.5" style={{ height: week.laneCount * LANE_H }}>
              {week.segs.map((seg) => {
                const hex = SCHEDULE_HEX[seg.session.schedule_type]
                const active = seg.session.id === selectedId
                const dimmed = selectedId !== null && !active
                const len = seg.endCol - seg.startCol + 1
                return (
                  <button
                    key={seg.session.id}
                    type="button"
                    data-schedule-bar
                    onClick={() => setSelectedId(active ? null : seg.session.id)}
                    title={`${seg.session.label} · ${seg.session.course?.name ?? ''}`}
                    aria-label={seg.session.label}
                    className="absolute h-[6px] transition-opacity"
                    style={{
                      left: `calc(${(seg.startCol / 7) * 100}% + 2px)`,
                      width: `calc(${(len / 7) * 100}% - 4px)`,
                      top: seg.lane * LANE_H,
                      backgroundColor: hex,
                      opacity: dimmed ? 0.32 : 1,
                      outline: active ? '1.5px solid #1e293b' : undefined,
                      outlineOffset: active ? '1.5px' : undefined,
                    }}
                  />
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 범례 — 타입 색↔라벨 (텍스트 담당) */}
      <div className="flex flex-wrap gap-x-3.5 gap-y-1.5 border-t border-[#e5eaef] px-4 py-3">
        {(Object.keys(SCHEDULE_HEX) as ScheduleType[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="h-[6px] w-4" style={{ backgroundColor: SCHEDULE_HEX[t] }} />
            <span className="fluid-nav-label text-[#6b7280]">{LEGEND_LABEL[t]}</span>
          </span>
        ))}
      </div>

      {/* 선택 차수 상세 — 카드 내부 섹션(구분선) */}
      {selected && (
        <div className="border-t border-[#e5eaef] bg-white/60 p-4">
          <div className="mb-2 flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="fluid-nav-label text-[#8a94a0]">{selected.course?.name ?? '연수'}</p>
              <h4 className="fluid-body font-[500] text-[#1f2937]">{selected.label}</h4>
            </div>
            <Badge color={SCHEDULE_TYPE[selected.schedule_type].color} size="sm" className="shrink-0">
              {SCHEDULE_TYPE[selected.schedule_type].label}
            </Badge>
          </div>
          <div className="fluid-body space-y-1 text-[#4b5563]">
            <p>{formatPeriod(selected.starts_on, selected.ends_on, selected.nights)}</p>
            <p className="inline-flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
              <Users size={14} className="text-[#9ca3af]" />
              <span className="tabular-nums">
                현재 신청인원 {applied}/{selected.capacity}
              </span>
              <span className="text-[clamp(0.6875rem,0.66rem+0.12vw,0.75rem)] text-[#8a94a0] tabular-nums">
                (신청가능인원 {remaining})
              </span>
            </p>
          </div>
          <Link
            href="/application"
            className="mt-3 inline-block fluid-nav-label font-[500] text-[#5b7cae] hover:underline"
          >
            신청하러 가기 →
          </Link>
        </div>
      )}
    </div>
  )
}
