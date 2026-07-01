'use client'

import React from 'react'

// 배지 컬러. Phase 2.5 톤 시스템(옅은 배경 + 진한 동일계열 글자).
// ⚠ 레거시 4키(orange/blue/green/gray)는 ScheduleCalendar(§5 범위밖·불변)의 상세 배지가
//   쓰므로 값 그대로 보존. 그 외 컴포넌트는 아래 딥네이비 계열 톤 키로 재배치한다.
const BADGE_COLORS = {
  // 레거시(달력 전용 — 건드리지 말 것)
  orange: 'bg-[#b87a5a]/10 text-[#b87a5a]',
  blue: 'bg-[#5b7cae]/10 text-[#5b7cae]',
  green: 'bg-[#6b9b7a]/10 text-[#6b9b7a]',
  gray: 'bg-[#7c8a96]/10 text-[#7c8a96]',
  // Phase 2.5 톤 (신청 status + 일반). 확정 2종(navy=입금확인·emerald=연수완료)은 배경 채도 진하게.
  amber: 'bg-[#fdefd6] text-[#8a4b00]',
  navy: 'bg-[#c9d6e6] text-[#1e3a5f]',
  emerald: 'bg-[#bfe0d0] text-[#0f5a3c]',
  slate: 'bg-[#eceff3] text-[#5b6675]',
  terracotta: 'bg-[#f7e6e1] text-[#8f3a2a]',
} as const

export type BadgeColor = keyof typeof BADGE_COLORS

interface BadgeProps {
  children: React.ReactNode
  color?: BadgeColor
  size?: 'sm' | 'md'
  className?: string
}

export function Badge({ children, color = 'blue', size = 'md', className = '' }: BadgeProps) {
  const sizeStyles = {
    sm: 'px-2 py-0.5 text-[11px]',
    md: 'px-2.5 py-1 text-[12px]',
  }
  return (
    <span
      className={`inline-flex items-center rounded-[4px] font-medium ${BADGE_COLORS[color]} ${sizeStyles[size]} ${className}`}
    >
      {children}
    </span>
  )
}
