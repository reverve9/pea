'use client'

import React, { ReactNode } from 'react'

// 페이지 내 섹션 구분 제목. 국문(S-Core Dream·네이비)만 — 영문/시안은 페이지 헤더 전용.
// en prop은 하위호환용으로 타입엔 유지하되 렌더 안 함(호출부 무변경).
export default function SectionTitle({
  title,
  right,
  rail = false,
}: {
  title: string
  en?: string
  right?: ReactNode
  // rail: 데스크탑 좌측(마스터/인덱스) 전용 컴팩트 뮤트 라벨. 모바일은 항상 정식 타이틀 유지.
  rail?: boolean
}) {
  // 영문(en)은 의도적으로 렌더 안 함 — 영문/시안 아이브로우는 페이지 헤더(정체성) 전용, 섹션 라벨은 국문만.
  const full = (
    <div className="flex items-end justify-between gap-2 px-1 mb-3">
      <div>
        {/* 포인트 바 — 시그니처 시안 액센트 */}
        <span className="block w-6 h-[2px] rounded-full bg-[#2f8ba0] mb-2" />
        <h2 className="font-score text-[clamp(0.9375rem,3.6vw,1.0625rem)] font-[500] leading-tight text-[#1e3a5f]">
          {title}
        </h2>
      </div>
      {right}
    </div>
  )
  if (!rail) return full
  // 좌측 인덱스 톤 — 우측 콘텐츠의 정식 타이틀과 위계 차별화(바 없음, 작고 뮤트, 자간).
  return (
    <>
      <div className="md:hidden">{full}</div>
      <div className="mb-3 hidden items-center justify-between gap-2 px-1 md:flex">
        <span className="font-score text-[12px] font-[500] uppercase tracking-[1.5px] text-[#6b7280]">
          {title}
        </span>
        {right}
      </div>
    </>
  )
}
