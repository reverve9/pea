'use client'

import React from 'react'
import { X } from 'lucide-react'

// 어드민 공용 모달 셸 — 중앙 정렬 카드 + 헤더(타이틀·닫기). 본문/버튼은 children.
export default function AdminModal({
  title,
  onClose,
  children,
  maxWidth = 560,
}: {
  title: string
  onClose: () => void
  children: React.ReactNode
  maxWidth?: number
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/40 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="my-auto w-full rounded-[14px] bg-white shadow-xl"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#eceef1] px-5 py-4">
          <h2 className="text-[16px] font-[600] text-[#1f2937]">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-1 text-[#6b7280] transition-colors hover:bg-[#f3f4f6]"
            aria-label="닫기"
          >
            <X size={20} />
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}
