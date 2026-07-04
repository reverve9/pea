'use client'

import { X } from 'lucide-react'

// 공용 중앙 모달 — 모바일 상세/폼용. 신청·커뮤니티가 동일 셸이라 통일.
// 본문 래퍼에 container-type:inline-size → 내부 cqi 텍스트가 모달 폭 기준으로 축소. [[type-scale-cqi-system]]
// ⚠ 연수안내 유형 모달은 헤더(아이콘+제목)·하단 CTA·portal·블러 오버레이라 별개 유지(CourseTypes 내부).
export default function Modal({
  onClose,
  children,
  maxWidth = 440,
}: {
  onClose: () => void
  children: React.ReactNode
  maxWidth?: number
}) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="flex max-h-[82vh] w-full flex-col overflow-hidden rounded-[16px] bg-white shadow-xl"
        style={{ maxWidth }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-end border-b border-[#eceef1] px-3 py-2">
          <button onClick={onClose} className="rounded-full p-1 hover:bg-[#f3f4f6]" aria-label="닫기">
            <X size={20} className="text-[#6b7280]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 [container-type:inline-size]">{children}</div>
      </div>
    </div>
  )
}
