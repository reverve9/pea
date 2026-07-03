'use client'

import React from 'react'

// 텍스트 역할(role) 티어 — 흩어진 폰트 스타일을 한 곳에서 관리. 위계 = 크기·컬러·굵기(볼드≠강조).
// 레이아웃(block·mt·w 등)은 className으로, 타이포(패밀리·크기·굵기·컬러·행간)만 variant로.
// 색은 기본값 내장, accent 등 예외만 color prop으로 override(인라인 style이 클래스보다 우선).
//
// ── 스타일 튜닝은 아래 VARIANT 한 곳에서. 롤 추가도 여기 + 타입에만.
export type TextVariant = 'label' | 'body' | 'sub' | 'caption' | 'num'

const VARIANT: Record<TextVariant, string> = {
  // 라벨/아이브로우(연수대상·기관·세부사항·비용) — 브랜드 폰트. 기본 뮤트, accent는 color override.
  label: 'font-score text-[clamp(0.71875rem,3.08vw,0.75rem)] font-[500] text-[#9ca3af]',
  // 주 읽기 값(대상·값·유형 항목) — 브랜드 폰트, near-black.
  body: 'font-score text-[clamp(0.8125rem,3.4vw,0.875rem)] font-[400] leading-relaxed text-[#374151]',
  // 부차 한 줄(일정·주소·스키복 등 부가) — 읽기 폰트(Pretendard), 진한 회색(가독성).
  // 데스크탑 max는 13.5px — Pretendard가 S-CoreDream보다 작게 보이는 갭 보정(+1px).
  sub: 'font-pretendard text-[clamp(0.71875rem,3.08vw,0.84375rem)] font-[300] leading-snug text-[#4b5563]',
  // 최소 주석(*note) — 읽기 폰트. 컬러는 sub와 동일(#4b5563), 크기로만 위계.
  caption: 'font-pretendard text-[clamp(0.6875rem,2.9vw,0.71875rem)] font-[400] leading-snug text-[#4b5563]',
  // 금액/수치 — 브랜드 폰트(S-CoreDream), tabular.
  num: 'font-score text-[clamp(0.8125rem,3.33vw,0.875rem)] font-[500] tabular-nums text-[#374151]',
}

type TextProps = {
  variant?: TextVariant
  as?: React.ElementType
  color?: string
  className?: string
  children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLElement>, 'color'>

export default function Text({
  variant = 'body',
  as: Tag = 'span',
  color,
  className = '',
  style,
  children,
  ...rest
}: TextProps) {
  return (
    <Tag
      className={`${VARIANT[variant]} ${className}`.trim()}
      style={color ? { color, ...style } : style}
      {...rest}
    >
      {children}
    </Tag>
  )
}
