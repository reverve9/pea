'use client'

import React, { ReactNode, CSSProperties } from 'react'
import Link from 'next/link'

// 좌측 마스터 선택 카드 공용 셸 — 인포그래픽 톤(흰 바탕, 테두리 없음, 블랙 그림자).
// - 기본(button) / href(Link): 3D 버튼. 아래 솔리드 "두께" 엣지 + 앰비언트 그림자. 누르면 그 두께만큼 내려가며 엣지가 사라져 바닥에 눌림(데/모 공통).
//   데스크탑은 호버 시 약간 확대(scale, translate와 다른 축이라 눌림과 독립). 선택 시 라이트 틴트.
// - as="div": 인터랙션 없는 셸(아코디언 컨테이너 등) — 평평한 앰비언트 그림자만(3D 엣지 없음, 눌림 없음).
// 선택 강조 = 테두리 아니라 라이트 틴트 배경(규칙). 틴트는 전 카드 통일(액센트 시안) — 아이콘칩이 카드별 고유색을 담당.
// 시안=액션/액티브 역할(네이비=텍스트/구조)이라 선택 신호로 더 또렷·산뜻(hue-on-hue 뭉개짐 회피).
const SELECTED_TINT = '#2f8ba01a' // 시안 #2f8ba0 · 알파 0x1a(≈10%)

// 3D 버튼: 5px 솔리드 밑면 엣지(블랙 11%) + 앰비언트.
const SHADOW_3D = 'shadow-[0_5px_0_-1px_rgba(0,0,0,0.11),0_11px_20px_-10px_rgba(0,0,0,0.25)]'
// 눌림: 엣지(5px)만큼 내려가고 엣지는 1px로 붕괴 → 카드 면이 바닥으로 눌림.
const PRESS_3D = 'active:translate-y-[4px] active:shadow-[0_1px_0_-1px_rgba(0,0,0,0.11),0_4px_9px_-8px_rgba(0,0,0,0.18)]'
// 비인터랙티브 컨테이너용 평평한 그림자.
const SHADOW_FLAT = 'shadow-[0_2px_6px_rgba(0,0,0,0.07),0_16px_36px_-12px_rgba(0,0,0,0.30)]'

type MasterCardProps = {
  as?: 'button' | 'div'
  href?: string // 주어지면 Next Link(a)로 렌더 — 버튼과 동일 3D 인터랙션
  selected?: boolean
  scale?: boolean // 데스크탑 호버 확대 (기본 true)
  onClick?: () => void
  className?: string
  style?: CSSProperties
  children: ReactNode
} & Omit<React.HTMLAttributes<HTMLElement>, 'style' | 'onClick'>

export default function MasterCard({
  as = 'button',
  href,
  selected = false,
  scale = true,
  onClick,
  className = '',
  style,
  children,
  ...rest
}: MasterCardProps) {
  const interactive = href ? true : as === 'button' // 버튼·링크 = 3D+호버, div = 평평
  const cls = `block w-full rounded-[12px] bg-white text-left transition-[transform,box-shadow,background-color] duration-100 ${
    interactive ? `${SHADOW_3D} ${PRESS_3D} ${scale ? 'md:hover:scale-[1.02]' : ''} will-change-transform` : SHADOW_FLAT
  } ${className}`.trim()
  // 선택 = 통일 라이트 틴트(시안). 미선택 = 흰색(class).
  const merged: CSSProperties = { ...(selected ? { backgroundColor: SELECTED_TINT } : {}), ...style }

  if (href) {
    return (
      <Link href={href} className={cls} style={merged} {...rest}>
        {children}
      </Link>
    )
  }
  if (as === 'button') {
    return (
      <button type="button" onClick={onClick} aria-pressed={selected} className={cls} style={merged} {...rest}>
        {children}
      </button>
    )
  }
  return (
    <div className={cls} style={merged} {...rest}>
      {children}
    </div>
  )
}
