'use client'

import React, { useState } from 'react'
import Text from '@/components/common/Text'

// 유형별 일차 일정표 — 연수안내 유형 상세 하단(클라이언트 2차 수정요청 p7·p8).
// 원본 4열 구조(일차/시간/내용/비고)는 표 그대로 유지하되 스타일만 우리 것으로:
//   회색 격자·전체 테두리 없이 헤더 하이라인 + 행 하이라인, 일차는 그룹 첫 행에만 표기(de-dup),
//   시간은 tabular-nums, 비고는 muted. [[admin-ui-conventions]] 표 어법과 동일.
// 모바일(모달 440)에선 비고 열을 접어 내용 아래 서브라인으로 — 4열을 억지로 밀어넣지 않는다.
// 자율은 박수별로 일정이 갈려 탭(2박 3일 / 1박 2일). 직무는 단일.
// 값은 하드코딩 — 회차마다 바뀌는 값이 아니라 유형 고정 커리큘럼이라 어드민 대상이 아니다. [[admin-scope-criteria]]

export interface PlanRow {
  time: string
  // 여러 줄인 항목은 배열로 — 원본 표에서 줄이 나뉜 그대로 유지한다.
  // 한 문자열로 합쳐 두면 셀 폭에 따라 엉뚱한 데서 끊긴다.
  title: string | string[]
  note?: string | string[]
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
        { time: '- 12:30', title: '개별 입소 · 개별 중식' },
        { time: '12:30 - 13:00', title: '개강식', note: '참가자 등록 및 안내 · 오리엔테이션' },
        { time: '13:00 - 15:50', title: '강습 1회차', note: '강습 반배정 · 장비렌탈' },
        { time: '15:50 - 16:50', title: '장비 보관 후 객실 이동', note: '집합장소에서 체크인' },
        { time: '16:50 - 18:30', title: '석식', note: '단체식' },
        { time: '18:30 - 19:00', title: '강습 준비' },
        { time: '19:00 - 20:50', title: '강습 2회차' },
        { time: '20:50 - 21:30', title: '장비 보관 후 객실 이동' },
        { time: '21:30 -', title: '개인 정비 후 취침' },
      ],
    },
    {
      day: '2일차',
      rows: [
        { time: '- 08:30', title: '기상 및 개별 조식' },
        { time: '08:30 - 09:00', title: '강습 준비' },
        { time: '09:00 - 11:30', title: '강습 3회차', note: '장비 착용·보관 시간 포함' },
        { time: '11:30 - 13:00', title: '중식', note: '단체식' },
        { time: '13:00 - 15:00', title: '강습 4회차' },
        { time: '15:00 - 16:00', title: '자율 연습', note: '16시 슬로프 마감(미정)' },
        { time: '16:00 - 17:00', title: '개인 정비' },
        { time: '17:00 - 18:30', title: '석식', note: '단체식' },
        { time: '18:30 - 21:30', title: '자율 연습 혹은 개인 정비' },
        { time: '21:30 -', title: '개인 정비 후 취침' },
      ],
    },
    {
      day: '3일차',
      rows: [
        { time: '- 08:30', title: '기상 및 개별 조식' },
        {
          time: '09:00 - 11:00',
          title: ['폐강식', '* 개별 실습', '* 개별 장비반납'],
          note: ['객실 체크아웃', '10시까지 집합장소에 키 반납', '반납 완료 인원 개별 귀가'],
        },
        { time: '11:00 -', title: '운영본부 정리', note: ['다음 차수 준비', '리프트권 · 빕조끼 · 의류 반납 확인'] },
      ],
    },
  ],
}

// 자율 1일차는 박수와 무관하게 동일 → 상수로 공유.
const JAYUL_DAY1: PlanDay = {
  day: '1일차',
  rows: [
    { time: '- 12:30', title: '개별 입소 · 개별 식사' },
    { time: '12:30 - 13:00', title: '안내 · 리프트권 제공', note: '참가자 등록 및 안내' },
    { time: '13:00 - 15:50', title: ['오후 강습', '(장비렌탈 · 기초 체험 강습)'], note: '입문 수준의 체험 강습 진행' },
    { time: '15:50 - 16:50', title: '장비 보관 후 객실 이동', note: '집합장소에서 객실키 수령' },
    { time: '16:50 - 18:30', title: '석식', note: '개별 식사' },
    { time: '18:30 - 20:50', title: '자율 연습' },
    { time: '20:50 - 21:30', title: '장비 보관 후 객실 이동' },
    { time: '21:30 -', title: '개인 정비 후 취침' },
  ],
}

// 자율 마지막 날(퇴소일) — 2박·1박 공통 형태.
const JAYUL_CHECKOUT: PlanRow[] = [
  { time: '- 09:00', title: '기상 및 조식', note: '조식뷔페 쿠폰 사용' },
  {
    time: '09:00 - 11:00',
    title: ['개별 퇴소', '* 자율 연습', '* 개별 장비반납'],
    note: ['객실 체크아웃', '10시까지 집합장소에 키 반납', '반납 완료 인원 개별 귀가'],
  },
  { time: '11:00 -', title: '운영본부 정리', note: ['다음 차수 준비', '리프트권 · 빕조끼 · 의류 반납 확인'] },
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
          { time: '- 09:00', title: '기상 및 조식', note: '조식뷔페 쿠폰 사용' },
          { time: '09:00 - 16:00', title: ['자율 연습', '개별 중식'], note: ['09시 슬로프 개장', '16시 슬로프 마감'] },
          { time: '16:00 - 17:00', title: '개인 정비' },
          { time: '17:00 - 18:30', title: '개별 석식', note: '개별 식사' },
          { time: '18:30 - 21:30', title: '자율 연습 혹은 개인 정비' },
          { time: '21:30 -', title: '개인 정비 후 취침' },
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

// 시간 문자열을 [시작, 종료]로 — '- 12:30'(시작 열림) / '21:30 -'(종료 열림) / '12:30 - 13:00'.
// 하이픈을 축으로 두고 시작은 우측, 종료는 좌측에 붙이면 행마다 숫자 자리가 정확히 맞는다.
function timeParts(t: string): [string, string] {
  const [a = '', b = ''] = t.split('-')
  return [a.trim(), b.trim()]
}

// 단일 문자열도 한 줄짜리 배열로 — 렌더 분기 없이 항상 줄 단위로 찍는다.
function toLines(v: string | string[]): string[] {
  return Array.isArray(v) ? v : [v]
}

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

      {/* 표 = 개요·캘린더와 같은 박스 어법(라운드 박스 + 틴트 헤더)으로 감싸 "표"임이 바로 보이게.
          table-fixed + 고정 폭으로 열이 흔들리지 않고, 일차는 rowSpan 세로 병합(원본 표와 동일). */}
      <div className="overflow-hidden rounded-[10px] border border-[#e5eaef] bg-white">
        <table className="w-full table-fixed text-left">
          <thead>
            <tr className="bg-[#eef2f6] text-[clamp(0.6875rem,2.6cqi,0.75rem)] font-[500] text-[#6b7280]">
              <th className="w-[42px] px-1.5 py-2.5 text-center font-[500] md:w-[54px] md:px-2">일차</th>
              <th className="w-[104px] px-1.5 py-2.5 text-center font-[500] md:w-[136px] md:px-2">시간</th>
              <th className="px-3 py-2.5 font-[500]">내용</th>
              <th className="hidden w-[38%] px-3 py-2.5 font-[500] md:table-cell">비고</th>
            </tr>
          </thead>
          <tbody>
            {plan.days.flatMap((d) =>
              d.rows.map((r, i) => (
                <tr
                  key={d.day + r.time + r.title}
                  className={i === 0 ? 'border-t border-[#dfe5ec] first:border-t-0' : 'border-t border-[#f1f4f7]'}
                >
                  {/* 일차 — 그룹 전체를 세로 병합. 옅은 틴트로 축(axis) 열임을 표시 */}
                  {i === 0 && (
                    <td
                      rowSpan={d.rows.length}
                      className="border-r border-[#eef1f5] bg-[#f7f9fb] px-1.5 text-center align-middle md:px-2"
                    >
                      <Text variant="label" as="span" color={accent} className="whitespace-nowrap">{d.day}</Text>
                    </td>
                  )}
                  {/* 시간 — 하이픈 축 3열 그리드(시작 우측 · 하이픈 · 종료 좌측)로 자리를 고정 */}
                  <td className="px-1.5 py-2.5 align-middle md:px-2">
                    <span className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-0.5 md:gap-1">
                      <Text variant="num" as="span" className="whitespace-nowrap text-right text-[#6b7280]">
                        {timeParts(r.time)[0]}
                      </Text>
                      <Text variant="num" as="span" className="text-[#b6bcc4]">-</Text>
                      <Text variant="num" as="span" className="whitespace-nowrap text-left text-[#6b7280]">
                        {timeParts(r.time)[1]}
                      </Text>
                    </span>
                  </td>
                  <td className="px-2 py-2.5 align-middle md:px-3">
                    {toLines(r.title).map((line) => (
                      <Text key={line} variant="body" as="span" className="block break-keep">{line}</Text>
                    ))}
                    {/* 모바일 = 비고 열을 접어 내용 아래로 */}
                    {r.note && (
                      <span className="mt-1 block md:hidden">
                        {toLines(r.note).map((line) => (
                          <Text key={line} variant="sub" as="span" className="block break-keep text-[#8a94a0]">{line}</Text>
                        ))}
                      </span>
                    )}
                  </td>
                  <td className="hidden px-3 py-2.5 align-middle md:table-cell">
                    {r.note &&
                      toLines(r.note).map((line) => (
                        <Text key={line} variant="sub" as="span" className="block break-keep text-[#8a94a0]">{line}</Text>
                      ))}
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
