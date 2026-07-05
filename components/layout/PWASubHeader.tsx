'use client'

import React from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'

// 모바일 서브페이지(주 네비에 없는 라우트, 예: /my) 상단 앱바 — PWA 관행.
// 하단 탭바 대신 ← 뒤로가기 + 페이지 타이틀(국문 + 영문). 뒤로=직전 페이지(없으면 홈).
export default function PWASubHeader({ title, en }: { title: string; en?: string }) {
  const router = useRouter()

  const back = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) router.back()
    else router.push('/')
  }

  return (
    <header className="sticky top-0 z-50 flex h-[80px] items-center gap-1 bg-gradient-to-r from-[#394053] via-[#49526B] to-[#A2AED0] px-2 text-white">
      <button
        type="button"
        onClick={back}
        aria-label="뒤로 가기"
        className="grid h-10 w-10 shrink-0 place-items-center rounded-full transition-colors hover:bg-white/10"
      >
        <ChevronLeft size={24} strokeWidth={2} />
      </button>
      <div className="flex items-baseline gap-2">
        <span className="font-score text-[18px] font-[400] tracking-[1px]">{title}</span>
        {en && <span className="font-raleway text-[12px] font-[400] uppercase tracking-[2px] text-white/65">{en}</span>}
      </div>
    </header>
  )
}
