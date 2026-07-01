'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, Users } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import WhiteBox from '@/components/common/WhiteBox'
import { EmptyState } from '@/components/common/StateView'
import { SCHEDULE_TYPE, formatPeriod } from '@/lib/display'
import type { SessionWithCourse, ScheduleType } from '@/lib/types'

// §3-2 연수일정 달력 — 경량 직접 구현(무거운 위젯 미사용).
// sessions 를 월 그리드에 표시: 차수는 시작일에 칩으로 앵커, 기간(starts~ends)은 셀 배경 틴트로.
// 읽기 전용 — 칩 클릭 시 상세 표시(신청 이동은 /apply 자리표시자 링크).

// 일정유형별 색 (Badge 팔레트와 동일 hex — 데이터 구동이라 인라인 스타일 사용)
const SCHEDULE_HEX: Record<ScheduleType, string> = {
  jikmu: '#b87a5a',
  weekday_2n: '#5b7cae',
  weekend_2n: '#6b9b7a',
  weekend_1n: '#7c8a96',
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

// 'YYYY-MM-DD' → 비교용 숫자키 (YYYYMMDD)
function keyOf(y: number, m1: number, d: number): number {
  return y * 10000 + m1 * 100 + d
}
function parseKey(iso: string): number {
  const [y, m, d] = iso.split('-').map(Number)
  return keyOf(y, m, d)
}

export default function ScheduleCalendar({ sessions }: { sessions: SessionWithCourse[] }) {
  // 시작 월: 가장 이른 차수의 월(없으면 현재)
  const earliest = useMemo(() => {
    if (sessions.length === 0) return new Date()
    const sorted = [...sessions].sort((a, b) => a.starts_on.localeCompare(b.starts_on))
    const [y, m] = sorted[0].starts_on.split('-').map(Number)
    return new Date(y, m - 1, 1)
  }, [sessions])

  const [view, setView] = useState({ year: earliest.getFullYear(), month0: earliest.getMonth() })
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { year, month0 } = view
  const month1 = month0 + 1

  // 이 달의 셀 배열(선행 공백 + 1..말일)
  const cells = useMemo(() => {
    const firstWeekday = new Date(year, month0, 1).getDay()
    const daysInMonth = new Date(year, month0 + 1, 0).getDate()
    const arr: (number | null)[] = Array(firstWeekday).fill(null)
    for (let d = 1; d <= daysInMonth; d++) arr.push(d)
    while (arr.length % 7 !== 0) arr.push(null)
    return arr
  }, [year, month0])

  const selected = sessions.find((s) => s.id === selectedId) ?? null

  const prevMonth = () =>
    setView((v) => (v.month0 === 0 ? { year: v.year - 1, month0: 11 } : { ...v, month0: v.month0 - 1 }))
  const nextMonth = () =>
    setView((v) => (v.month0 === 11 ? { year: v.year + 1, month0: 0 } : { ...v, month0: v.month0 + 1 }))

  if (sessions.length === 0) {
    return <EmptyState label="등록된 연수 일정이 없습니다." />
  }

  // 셀 기준: 시작 차수 / 커버 여부
  const sessionsStartingOn = (day: number) =>
    sessions.filter((s) => parseKey(s.starts_on) === keyOf(year, month1, day))
  const coveringColor = (day: number): string | null => {
    const k = keyOf(year, month1, day)
    const s = sessions.find((s) => parseKey(s.starts_on) <= k && k <= parseKey(s.ends_on))
    return s ? SCHEDULE_HEX[s.schedule_type] : null
  }

  return (
    <div>
      {/* 헤더: 월 네비 */}
      <div className="flex items-center justify-between mb-3 px-1">
        <button
          type="button"
          onClick={prevMonth}
          className="p-1.5 rounded-full hover:bg-[#f3f4f6] text-[#6b7280]"
          aria-label="이전 달"
        >
          <ChevronLeft size={18} />
        </button>
        <h4 className="fluid-body font-[500] text-[#1f2937] tabular-nums">
          {year}. {String(month1).padStart(2, '0')}
        </h4>
        <button
          type="button"
          onClick={nextMonth}
          className="p-1.5 rounded-full hover:bg-[#f3f4f6] text-[#6b7280]"
          aria-label="다음 달"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 범례 */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-3 px-1">
        {(Object.keys(SCHEDULE_HEX) as ScheduleType[]).map((t) => (
          <span key={t} className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-[3px]" style={{ backgroundColor: SCHEDULE_HEX[t] }} />
            <span className="fluid-nav-label text-[#6b7280]">{SCHEDULE_TYPE[t].label}</span>
          </span>
        ))}
      </div>

      {/* 그리드 */}
      <WhiteBox className="p-2">
        <div className="grid grid-cols-7">
          {WEEKDAYS.map((w, i) => (
            <div
              key={w}
              className={`text-center fluid-nav-label font-[500] py-1.5 ${
                i === 0 ? 'text-[#c0685a]' : i === 6 ? 'text-[#5b7cae]' : 'text-[#9ca3af]'
              }`}
            >
              {w}
            </div>
          ))}
          {cells.map((day, idx) => {
            if (day === null) return <div key={`e${idx}`} className="min-h-[52px]" />
            const starts = sessionsStartingOn(day)
            const cover = coveringColor(day)
            const weekday = idx % 7
            return (
              <div
                key={day}
                className="min-h-[52px] border-t border-[#f3f4f6] p-1 align-top"
                style={cover ? { backgroundColor: cover + '12' } : undefined}
              >
                <div
                  className={`text-right fluid-nav-label tabular-nums pr-0.5 ${
                    weekday === 0 ? 'text-[#c0685a]' : weekday === 6 ? 'text-[#5b7cae]' : 'text-[#9ca3af]'
                  }`}
                >
                  {day}
                </div>
                <div className="space-y-0.5 mt-0.5">
                  {starts.map((s) => {
                    const hex = SCHEDULE_HEX[s.schedule_type]
                    const active = s.id === selectedId
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => setSelectedId(active ? null : s.id)}
                        className="block w-full text-left rounded-[3px] px-1 py-0.5 leading-tight transition-opacity hover:opacity-80"
                        style={{
                          backgroundColor: hex + (active ? '' : '22'),
                          color: active ? '#fff' : hex,
                          borderLeft: `2px solid ${hex}`,
                        }}
                        title={`${s.label} · ${s.course?.name ?? ''}`}
                      >
                        <span className="fluid-nav-label font-[500] block truncate">{s.label}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      </WhiteBox>

      {/* 선택 차수 상세 */}
      {selected && (
        <WhiteBox className="p-4 mt-3">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="min-w-0">
              <p className="fluid-nav-label text-[#8a94a0]">{selected.course?.name ?? '연수'}</p>
              <h4 className="fluid-body font-[500] text-[#1f2937]">{selected.label}</h4>
            </div>
            <Badge color={SCHEDULE_TYPE[selected.schedule_type].color} size="sm" className="shrink-0">
              {SCHEDULE_TYPE[selected.schedule_type].label}
            </Badge>
          </div>
          <div className="fluid-body text-[#4b5563] space-y-1">
            <p>{formatPeriod(selected.starts_on, selected.ends_on, selected.nights)}</p>
            <p className="inline-flex items-center gap-1.5">
              <Users size={14} className="text-[#9ca3af]" />
              정원 {selected.capacity}명
            </p>
          </div>
          <Link
            href="/apply"
            className="inline-block mt-3 fluid-nav-label font-[500] text-[#5b7cae] hover:underline"
          >
            신청 안내 보기 →
          </Link>
        </WhiteBox>
      )}
    </div>
  )
}
