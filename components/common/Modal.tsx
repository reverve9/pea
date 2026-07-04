'use client'

import { X } from 'lucide-react'
import Text from './Text'

// 공용 중앙 모달 — 모바일 상세/폼용. 신청·커뮤니티가 동일 셸이라 통일.
// 본문 래퍼에 container-type:inline-size → 내부 cqi 텍스트가 모달 폭 기준으로 축소. [[type-scale-cqi-system]]
// 제목은 title 슬롯으로 — 모달 헤더 타이포(card-title)를 컴포넌트가 소유해 단일 진실원천. 크기는 컨테이너 비례.
// ⚠ 연수안내 유형 모달은 하단 CTA·portal·블러 오버레이라 별개 유지(CourseTypes 내부), 헤더 타이포만 card-title 참조.
export default function Modal({
  onClose,
  children,
  title,
  icon,
  maxWidth = 440,
}: {
  onClose: () => void
  children: React.ReactNode
  title?: React.ReactNode
  icon?: React.ReactNode
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
        <div className="flex items-center gap-2 border-b border-[#eceef1] px-3 py-2 [container-type:inline-size]">
          {icon}
          {title != null && (
            <Text variant="card-title" as="h2" className="min-w-0 flex-1 truncate">
              {title}
            </Text>
          )}
          <button onClick={onClose} className="ml-auto rounded-full p-1 hover:bg-[#f3f4f6]" aria-label="닫기">
            <X size={20} className="text-[#6b7280]" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 [container-type:inline-size]">{children}</div>
      </div>
    </div>
  )
}
