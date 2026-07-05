'use client'

import React, { useState } from 'react'
import { ChevronDown, GraduationCap, Boxes } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Text from '@/components/common/Text'
import { SCHEDULE_HEX } from './ScheduleCalendar'
import type { SessionWithCourse, ScheduleType } from '@/lib/types'

// /courses 데스크탑 좌측 마스터 — 과정(프로그램) → 유형(직무/자율) 아코디언 → 차수(일정).
// taxonomy: 프로그램=종목(스키·스노보드 등, 향후 테니스·운동처방), 유형=직무연수/자율패키지, 차수=개별 일정.
// 차수 클릭 → 우측 캘린더 해당 월로 점프(+행 하이라이트). 선택 표시=유형색 옅은 틴트만.
const NAVY = '#1e3a5f'
const GREEN = '#2f803a'

// 자율 3종 변형명(직무는 변형 없음)
const VARIANT_LABEL: Record<Exclude<ScheduleType, 'jikmu'>, string> = {
  weekend_2n: '주말 2박',
  weekend_1n: '주말 1박',
  weekday_2n: '주중 2박',
}

// "2027-01-11" → "01/11" (일정 기간 슬래시 표기)
const md = (iso: string) => iso.slice(5).replace('-', '/')

interface TypeGroup {
  key: 'jikmu' | 'jayul'
  name: string
  color: string
  target: string // 연수대상 — 카드 서브
  icon: LucideIcon // 신청/유형 페이지와 동일 아이콘(직무=GraduationCap / 자율=Boxes)
  sessions: SessionWithCourse[]
}

// 과정 내 세션을 유형(직무/자율)으로 묶기 — 존재하는 그룹만, 직무 먼저.
function groupByType(sessions: SessionWithCourse[]): TypeGroup[] {
  const jikmu = sessions.filter((s) => s.schedule_type === 'jikmu')
  const jayul = sessions.filter((s) => s.schedule_type !== 'jikmu')
  const groups: TypeGroup[] = []
  if (jikmu.length)
    groups.push({
      key: 'jikmu',
      name: '직무연수',
      color: NAVY,
      target: '전국 교원 및 교육전문직',
      icon: GraduationCap,
      sessions: jikmu,
    })
  if (jayul.length)
    groups.push({
      key: 'jayul',
      name: '자율패키지',
      color: GREEN,
      target: '교원·공무원 및 그 가족·지인',
      icon: Boxes,
      sessions: jayul,
    })
  return groups
}

// 프로그램(종목)별 그룹 = course.sport("스키·스노보드"). 직무/자율 course가 같은 sport를 공유하므로
// sport로 묶어야 프로그램 1개 아래 유형 2개가 됨(course.id로 묶으면 프로그램이 쪼개짐).
// 현재 스키·스노보드 1개, 향후 테니스·운동처방 등 다종목 대비 등장순 유지.
function groupByProgram(sessions: SessionWithCourse[]): { name: string; sessions: SessionWithCourse[] }[] {
  const order: string[] = []
  const map = new Map<string, { name: string; sessions: SessionWithCourse[] }>()
  for (const s of sessions) {
    const key = s.course?.sport ?? '기타'
    if (!map.has(key)) {
      map.set(key, { name: key, sessions: [] })
      order.push(key)
    }
    map.get(key)!.sessions.push(s)
  }
  return order.map((k) => map.get(k)!)
}

function TypeAccordion({
  group,
  selectedId,
  onSelect,
}: {
  group: TypeGroup
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  const [open, setOpen] = useState(false) // 처음엔 닫힘 — 기본 펼침 규칙 없음
  const sorted = [...group.sessions].sort(
    (a, b) => a.starts_on.localeCompare(b.starts_on) || a.sort_order - b.sort_order,
  )
  // 이 그룹의 차수가 선택되면 헤더 카드에 유형색 틴트 — 유형 좌카드 선택 피드백과 동일.
  const groupSelected = group.sessions.some((s) => s.id === selectedId)
  return (
    <div className="overflow-hidden rounded-[10px] border border-[#e5eaef] bg-[#f2f5f9]">
      {/* 유형 헤더 — 유형명(유형색) + 차수 수 + 셰브론 */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors"
        style={{ background: groupSelected ? group.color + '14' : undefined }}
      >
        {/* 아이콘 + 타이틀 + 서브(연수대상) — 유형 좌카드와 동일 포맷으로 통일 */}
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
          style={{ background: group.color + '14' }}
        >
          <group.icon size={18} strokeWidth={1.75} style={{ color: group.color }} />
        </span>
        <span className="min-w-0 flex-1">
          <Text variant="card-title" as="span" className="block">
            {group.name}
          </Text>
          <Text variant="card-sub" as="span" className="mt-0.5 block">
            {group.target}
          </Text>
        </span>
        <ChevronDown
          size={17}
          className="shrink-0 transition-transform"
          style={{ transform: open ? 'rotate(180deg)' : undefined, color: open ? group.color : '#9ca3af' }}
        />
      </button>

      {/* 차수 — 날짜 우선(진한 tabular) + 자율은 변형명(유형색). 클릭 → 캘린더 점프. */}
      {open && (
        <div className="border-t border-[#e5eaef] bg-white px-2 py-1.5">
          {sorted.map((s) => {
            const on = s.id === selectedId
            const isJayul = s.schedule_type !== 'jikmu'
            return (
              <button
                key={s.id}
                type="button"
                data-schedule-pick
                onClick={() => onSelect(s.id)}
                aria-pressed={on}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left transition-colors"
                style={{ background: on ? SCHEDULE_HEX[s.schedule_type] + '14' : undefined }}
              >
                <Text variant="sub" className="shrink-0 tabular-nums text-[#374151]">
                  {md(s.starts_on)}–{md(s.ends_on)}
                </Text>
                {isJayul && (
                  <Text variant="sub" className="ml-auto min-w-0 truncate text-right">
                    <span
                      className="font-[500]"
                      style={{ color: SCHEDULE_HEX[s.schedule_type] }}
                    >
                      {VARIANT_LABEL[s.schedule_type as Exclude<ScheduleType, 'jikmu'>]}
                    </span>
                  </Text>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ScheduleMaster({
  sessions,
  selectedId,
  onSelect,
}: {
  sessions: SessionWithCourse[]
  selectedId: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div className="space-y-5">
      {groupByProgram(sessions).map((prog) => (
        <div key={prog.name}>
          {/* 프로그램(종목) 라벨 — 이 유형들이 어느 종목의 것인지 명시(다종목 대비) */}
          <div className="mb-2 px-1 font-score text-[clamp(0.625rem,2.4cqi,0.75rem)] font-[500] text-[#6b7280]">
            {prog.name} 연수 프로그램
          </div>
          <div className="space-y-2">
            {groupByType(prog.sessions).map((g) => (
              <TypeAccordion key={g.key} group={g} selectedId={selectedId} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
