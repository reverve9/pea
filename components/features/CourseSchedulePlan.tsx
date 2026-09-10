'use client'

import React, { useState } from 'react'
import Text from '@/components/common/Text'

// 유형별 일차 일정표 — 연수안내 유형 상세 하단(클라이언트 2차 수정요청 p7·p8).
// ⚠ 원본은 4열 회색 격자표(일차/시간/내용/비고)지만 그대로 옮기지 않는다 — 우리 표 어법으로 재구성:
//   일차 = rail 라벨 구간, 행 = [시간 | 내용 + 비고 서브라인]. 테두리·격자 없음([[no-borders-rule]]),
//   좁은 폭(모바일 모달 440)에서도 가로 스크롤 없이 읽힌다.
// 자율은 박수별로 일정이 갈려 탭(2박 3일 / 1박 2일). 직무는 단일.
// 값은 하드코딩 — 회차마다 바뀌는 값이 아니라 유형 고정 커리큘럼이라 어드민 대상이 아니다. [[admin-scope-criteria]]

export interface PlanRow {
  time: string
  title: string
  note?: string
}
export interface PlanDay {
  day: string
  rows: PlanRow[]
}
export interface SchedulePlan {
  key: string
  label: string // 탭 라벨(단일 플랜이면 미표시)
  days: PlanDay[]
}

// ── 직무연수 2박 3일 ───────────────────────────────────────────
const JIKMU_PLAN: SchedulePlan = {
  key: 'jikmu',
  label: '2박 3일',
  days: [
    {
      day: '1일차',
      rows: [
        { time: '~ 12:30', title: '개별 입소 · 개별 중식' },
        { time: '12:30 – 13:00', title: '개강식', note: '참가자 등록 및 안내 · 오리엔테이션' },
        { time: '13:00 – 15:50', title: '강습 1회차', note: '강습 반배정 · 장비렌탈' },
        { time: '15:50 – 16:50', title: '장비 보관 후 객실 이동', note: '집합장소에서 체크인' },
        { time: '16:50 – 18:30', title: '석식', note: '단체식' },
        { time: '18:30 – 19:00', title: '강습 준비' },
        { time: '19:00 – 20:50', title: '강습 2회차' },
        { time: '20:50 – 21:30', title: '장비 보관 후 객실 이동' },
        { time: '21:30 ~', title: '개인 정비 후 취침' },
      ],
    },
    {
      day: '2일차',
      rows: [
        { time: '~ 08:30', title: '기상 및 개별 조식' },
        { time: '08:30 – 09:00', title: '강습 준비' },
        { time: '09:00 – 11:30', title: '강습 3회차', note: '장비 착용·보관 시간 포함' },
        { time: '11:30 – 13:00', title: '중식', note: '단체식' },
        { time: '13:00 – 15:00', title: '강습 4회차' },
        { time: '15:00 – 16:00', title: '자율 연습', note: '16시 슬로프 마감(미정)' },
        { time: '16:00 – 17:00', title: '개인 정비' },
        { time: '17:00 – 18:30', title: '석식', note: '단체식' },
        { time: '18:30 – 21:30', title: '자율 연습 혹은 개인 정비' },
        { time: '21:30 ~', title: '개인 정비 후 취침' },
      ],
    },
    {
      day: '3일차',
      rows: [
        { time: '~ 08:30', title: '기상 및 개별 조식' },
        {
          time: '09:00 – 11:00',
          title: '폐강식 · 개별 실습 · 개별 장비반납',
          note: '객실 체크아웃 · 10시까지 집합장소에 키 반납 · 반납 완료 인원 개별 귀가',
        },
        { time: '11:00 ~', title: '운영본부 정리', note: '다음 차수 준비 · 리프트권·빕조끼·의류 반납 확인' },
      ],
    },
  ],
}

// 자율 1일차는 박수와 무관하게 동일 → 상수로 공유.
const JAYUL_DAY1: PlanDay = {
  day: '1일차',
  rows: [
    { time: '~ 12:30', title: '개별 입소 · 개별 식사' },
    { time: '12:30 – 13:00', title: '안내 · 리프트권 제공', note: '참가자 등록 및 안내' },
    { time: '13:00 – 15:50', title: '오후 강습 (장비렌탈 · 기초 체험 강습)', note: '입문 수준의 체험 강습 진행' },
    { time: '15:50 – 16:50', title: '장비 보관 후 객실 이동', note: '집합장소에서 객실키 수령' },
    { time: '16:50 – 18:30', title: '석식', note: '개별 식사' },
    { time: '18:30 – 20:50', title: '자율 연습' },
    { time: '20:50 – 21:30', title: '장비 보관 후 객실 이동' },
    { time: '21:30 ~', title: '개인 정비 후 취침' },
  ],
}

// 자율 마지막 날(퇴소일) — 2박·1박 공통 형태.
const JAYUL_CHECKOUT: PlanRow[] = [
  { time: '~ 09:00', title: '기상 및 조식', note: '조식뷔페 쿠폰 사용' },
  {
    time: '09:00 – 11:00',
    title: '개별 퇴소 · 자율 연습 · 개별 장비반납',
    note: '객실 체크아웃 · 10시까지 집합장소에 키 반납 · 반납 완료 인원 개별 귀가',
  },
  { time: '11:00 ~', title: '운영본부 정리', note: '다음 차수 준비 · 리프트권·빕조끼·의류 반납 확인' },
]

// ── 자율패키지 ────────────────────────────────────────────────
const JAYUL_PLANS: SchedulePlan[] = [
  {
    key: 'jayul_2n',
    label: '2박 3일',
    days: [
      JAYUL_DAY1,
      {
        day: '2일차',
        rows: [
          { time: '~ 09:00', title: '기상 및 조식', note: '조식뷔페 쿠폰 사용' },
          { time: '09:00 – 16:00', title: '자율 연습 · 개별 중식', note: '09시 슬로프 개장 · 16시 슬로프 마감' },
          { time: '16:00 – 17:00', title: '개인 정비' },
          { time: '17:00 – 18:30', title: '개별 석식', note: '개별 식사' },
          { time: '18:30 – 21:30', title: '자율 연습 혹은 개인 정비' },
          { time: '21:30 ~', title: '개인 정비 후 취침' },
        ],
      },
      { day: '3일차', rows: JAYUL_CHECKOUT },
    ],
  },
  {
    key: 'jayul_1n',
    label: '1박 2일',
    // 1일차는 2박과 동일, 2일차는 퇴소일(JAYUL_CHECKOUT) — 원본 표로 확인됨(2026-09-10 오너 캡처).
    // (PDF p8 두 번째 표는 슬라이드 밖으로 잘려 있어 별도 캡처로 대조했다.)
    days: [JAYUL_DAY1, { day: '2일차', rows: JAYUL_CHECKOUT }],
  },
]

export function plansFor(typeKey: string): SchedulePlan[] {
  return typeKey === 'jikmu' ? [JIKMU_PLAN] : JAYUL_PLANS
}

// 일정표 블록 — 유형 상세(TypeDetail) 하단. 플랜이 2개 이상이면 탭.
export default function CourseSchedulePlan({ typeKey, accent }: { typeKey: string; accent: string }) {
  const plans = plansFor(typeKey)
  const [idx, setIdx] = useState(0)
  const plan = plans[Math.min(idx, plans.length - 1)]

  return (
    <div className="mt-4 border-t border-[#e5eaef] pt-3">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <Text as="p" variant="label" color={accent}>일정표</Text>
        {/* 박수별 탭 — 틴트 트랙 + 활성 솔리드(테두리 없음). 플랜 1개면 숨김. */}
        {plans.length > 1 && (
          <div className="flex gap-0.5 rounded-[8px] bg-[#f2f5f9] p-0.5" role="tablist">
            {plans.map((p, i) => {
              const on = p.key === plan.key
              return (
                <button
                  key={p.key}
                  type="button"
                  role="tab"
                  aria-selected={on}
                  onClick={() => setIdx(i)}
                  className="rounded-[6px] px-2.5 py-1 font-score text-[clamp(0.6875rem,2.6cqi,0.75rem)] transition-colors duration-200"
                  style={on ? { background: accent, color: '#ffffff', fontWeight: 500 } : { color: '#8a93a0', fontWeight: 400 }}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-3.5">
        {plan.days.map((d) => (
          <div key={d.day}>
            {/* 일차 — rail + 라벨(좌측 섹션 어법 축소판) */}
            <div className="mb-1.5 flex items-center gap-2">
              <span className="h-[2px] w-3 shrink-0" style={{ background: accent }} />
              <Text as="p" variant="label" color={accent}>{d.day}</Text>
            </div>
            <div className="space-y-1.5">
              {d.rows.map((r) => (
                <div key={r.time + r.title} className="flex gap-3">
                  <Text variant="num" as="span" className="w-[92px] shrink-0 text-[#8a94a0]">{r.time}</Text>
                  <span className="min-w-0 flex-1">
                    <Text variant="body" as="span" className="block">{r.title}</Text>
                    {r.note && (
                      <Text variant="sub" as="span" className="mt-0.5 block text-[#8a94a0]">{r.note}</Text>
                    )}
                  </span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
