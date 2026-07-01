'use client'

import React from 'react'

// 배지 컬러 (병렬 구분용). 나인브릿지 팔레트 그대로. 정적 리터럴 클래스로 이식.
const BADGE_COLORS = {
  orange: 'bg-[#b87a5a]/10 text-[#b87a5a]',
  blue: 'bg-[#5b7cae]/10 text-[#5b7cae]',
  green: 'bg-[#6b9b7a]/10 text-[#6b9b7a]',
  gray: 'bg-[#7c8a96]/10 text-[#7c8a96]',
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
