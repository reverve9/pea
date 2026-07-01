'use client'

import React from 'react'

// 나인브릿지 버튼 컬러. 주의: Tailwind v4 는 소스 스캔 방식이라 `bg-[${var}]` 같은
// 템플릿 조합 클래스는 인식하지 못한다 → 완전한 정적 리터럴 클래스로 이식(시각 결과 동일).

interface ButtonProps {
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

const sizeStyles = {
  sm: 'px-3 py-1.5 text-[13px]',
  md: 'px-4 py-2 text-[14px]',
  lg: 'px-6 py-3 text-[15px]',
}

const variantStyles = {
  primary:
    'bg-[#5b7cae] text-white hover:bg-[#4a6b9d] disabled:bg-[#7c8a96] disabled:cursor-not-allowed',
  secondary:
    'bg-[#4a6b9d]/10 text-[#5b7cae] hover:bg-[#4a6b9d]/20 disabled:bg-[#7c8a96]/10 disabled:text-[#7c8a96] disabled:cursor-not-allowed',
  outline:
    'border border-[#5b7cae] text-[#5b7cae] hover:bg-[#5b7cae]/10 disabled:border-[#7c8a96] disabled:text-[#7c8a96] disabled:cursor-not-allowed',
  ghost:
    'text-[#5b7cae] hover:bg-[#5b7cae]/10 disabled:text-[#7c8a96] disabled:cursor-not-allowed',
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  type = 'button',
}: ButtonProps) {
  const baseStyles =
    'inline-flex items-center justify-center font-medium transition-colors rounded-md'
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

// 탭 버튼
interface TabButtonProps {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export function TabButton({
  children,
  active = false,
  onClick,
  disabled = false,
  className = '',
}: TabButtonProps) {
  const styles = disabled
    ? 'bg-white text-[#7c8a96] border-[#e5e7eb] cursor-not-allowed'
    : active
      ? 'bg-[#5b7cae] text-white border-[#5b7cae]'
      : 'bg-white text-[#6b7280] border-[#e5e7eb] hover:border-[#4a6b9d] hover:text-[#4a6b9d]'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 text-[12px] rounded-[4px] transition-colors border ${styles} ${className}`}
    >
      {children}
    </button>
  )
}

// 태그 버튼
interface TagButtonProps {
  children: React.ReactNode
  active?: boolean
  onClick?: () => void
  disabled?: boolean
  className?: string
}

export function TagButton({
  children,
  active = false,
  onClick,
  disabled = false,
  className = '',
}: TagButtonProps) {
  const styles = disabled
    ? 'bg-gray-100 text-[#7c8a96] cursor-not-allowed'
    : active
      ? 'bg-[#5b7cae] text-white'
      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-2.5 py-1 text-[12px] rounded-full transition-colors ${styles} ${className}`}
    >
      {children}
    </button>
  )
}
