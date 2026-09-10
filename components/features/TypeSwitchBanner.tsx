'use client'

import React from 'react'
import { ArrowRight } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import Text from '@/components/common/Text'

// 유형 전환 배너(정본) — 좌 = 현재 유형 배지, 우 = 반대 유형 전환 버튼.
// 우 페인이 한 번에 한 유형만 보여주는 화면(신청 폼 · 연수안내 유형 상세) 공용.
// 긴 본문을 스크롤해도 "지금 이 유형"이 각인되고, 다른 유형으로 가는 경로가 항상 한 줄에 있다.
// action = 전환 버튼 동사('신청하기' / '보기') — 페이지 성격만 다르고 구조는 동일. [[match-canonical-not-hardcode]]

export type BannerType = { key: string; title: string; spec: string; accent: string; icon: LucideIcon }

export default function TypeSwitchBanner({
  current,
  other,
  onSwitch,
  action = '보기',
}: {
  current: BannerType
  other?: BannerType
  onSwitch: (key: string) => void
  action?: string
}) {
  const Icon = current.icon
  return (
    <div className="mb-5 flex items-center justify-between gap-3">
      {/* 현재 유형 배지 카드 — 1/2 폭(유형 전환해도 통일), 유형색 라이트 틴트 */}
      <div
        className="flex w-1/2 min-w-0 items-center gap-2.5 rounded-[10px] border border-[#e5eaef] px-3.5 py-2.5"
        style={{ background: current.accent + '14' }}
      >
        <span
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full"
          style={{ background: current.accent + '24' }}
        >
          <Icon size={15} strokeWidth={1.75} style={{ color: current.accent }} />
        </span>
        <Text variant="card-title" as="span" color={current.accent}>{current.title}</Text>
        <Text variant="card-sub" as="span" className="truncate">{current.spec}</Text>
      </div>
      {/* 반대 유형 전환 — 솔리드 필(반대 유형색 배경 + 화이트 텍스트)로 강조 */}
      {other && (
        <button
          type="button"
          onClick={() => onSwitch(other.key)}
          className="flex shrink-0 items-center gap-1 rounded-[8px] px-3.5 py-2 text-white transition-[filter] hover:brightness-95"
          style={{ background: other.accent }}
        >
          <Text variant="card-title-sm" as="span" color="#fff">{other.title} {action}</Text>
          <ArrowRight size={13} />
        </button>
      )}
    </div>
  )
}
