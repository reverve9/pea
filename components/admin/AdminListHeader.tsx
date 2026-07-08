'use client'

import React from 'react'
import AdminToolbar from './AdminToolbar'

// 어드민 리스트 공용 상단영역 — 틴트 박스(AdminToolbar) 위에 좌(카운트/필터)·우(액션·페이지네이션) 배치.
// 모든 리스트형 페이지의 상단을 이걸로 통일한다(bare flex 액션바 재구현 금지). [[admin-ui-conventions]]
// filterable 리스트(신청·정산)는 AdminList/AdminToolbar 를 직접 쓰고, 단순 리스트는 이 컴포넌트를 쓴다.
export default function AdminListHeader({
  count,
  unit = '건',
  left,
  right,
  className = 'mb-4',
}: {
  count?: number // 좌측 '전체 N건' — left 미지정 시 노출
  unit?: string
  left?: React.ReactNode // 필터 등(주면 카운트 대신 이걸 좌측에)
  right?: React.ReactNode // 액션 버튼 · 페이지네이션
  className?: string
}) {
  return (
    <AdminToolbar className={className} right={right}>
      {left ??
        (count != null ? (
          <p className="whitespace-nowrap text-[12px] font-[300] text-[#6b7280]">
            전체 <span className="font-[600] tabular-nums text-[#1f2937]">{count}</span>
            {unit}
          </p>
        ) : null)}
    </AdminToolbar>
  )
}

// 리스트 상단 액션 버튼 공용 — primary(솔리드 네이비) / secondary(틴트 채움). 테두리 없음.
export function AdminHeaderButton({
  variant = 'primary',
  onClick,
  children,
}: {
  variant?: 'primary' | 'secondary'
  onClick: () => void
  children: React.ReactNode
}) {
  const cls =
    variant === 'primary'
      ? 'bg-[#1e3a5f] text-white hover:opacity-90'
      : 'bg-[#eef1f4] text-[#4b5563] hover:bg-[#e4e8ec]'
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-1.5 rounded-[8px] px-3.5 py-1.5 text-[12.5px] font-[500] transition-colors ${cls}`}
    >
      {children}
    </button>
  )
}
