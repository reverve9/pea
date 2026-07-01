'use client'

import React, { ReactNode } from 'react'
import { Loader, Inbox } from 'lucide-react'

// Phase 2b 공통 상태 뷰: 로딩 / 빈 상태. 시드가 비어도 레이아웃이 안 깨지게(§2 데이터 방침).
// 스타일 토큰은 여기에 모으고 페이지는 조립만(원칙1).

export function LoadingState({ label = '불러오는 중…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[#9ca3af]">
      <Loader className="w-7 h-7 animate-spin" />
      <p className="fluid-body mt-3">{label}</p>
    </div>
  )
}

export function EmptyState({
  label = '등록된 내용이 없습니다.',
  icon,
}: {
  label?: string
  icon?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-[#9ca3af]">
      {icon ?? <Inbox className="w-8 h-8" />}
      <p className="fluid-body mt-3 text-center px-6">{label}</p>
    </div>
  )
}
