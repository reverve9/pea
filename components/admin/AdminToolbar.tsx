'use client'

import React from 'react'

// 어드민 공용 필터/정렬 툴바 셸 — 배경 틴트 박스(테두리 없음). 정본 = 신청관리 리스트 상단 바.
// 좌 = 필터/컨트롤(children), 우 = 메타/액션(right 슬롯: 건수·페이지네이션·내보내기 등).
// 규칙: 어드민 리스트 위 컨트롤 바가 필요하면 이 셸을 쓴다(틴트 박스 인라인 재구현 금지). [[match-canonical-not-hardcode]]

// 툴바 안 입력 필드 공용 클래스 — 흰 채움 + 포커스 시 틴트 심화. 테두리 절대 없음(포커스 아웃라인은 .admin-field 로 억제).
export const adminFieldClass =
  'admin-field rounded-[7px] bg-white px-2.5 py-1.5 text-[12.5px] font-[400] text-[#374151] outline-none focus:bg-[#e7eef7]'

// 셀렉트 — 필드 + native appearance 제거(테두리 없이 평탄화) + 커스텀 셰브런.
export const adminSelectClass = `admin-select ${adminFieldClass}`

export default function AdminToolbar({
  children,
  right,
  className = '',
}: {
  children: React.ReactNode
  right?: React.ReactNode
  className?: string
}) {
  return (
    <div className={`flex items-center justify-between gap-3 rounded-[10px] bg-[#eef2f6] px-4 py-2.5 ${className}`}>
      <div className="min-w-0 flex-1">{children}</div>
      {right && <div className="flex shrink-0 items-center gap-4">{right}</div>}
    </div>
  )
}
