'use client'

import React from 'react'
import { Drawer } from 'vaul'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { useIsMobile } from '@/lib/useIsMobile'

/**
 * 콘텐츠 무관 반응형 상세 컨테이너 (Phase 2.6 프리미티브).
 * - 데스크탑(≥768): Extended 780 페인에 인라인 렌더(드로어 아님) + X 닫기.
 * - 모바일(<768): vaul Drawer(하단 시트). 그랩 핸들·내부 스크롤. 비주얼은 vaul 기본값(후속 다듬음).
 * - 닫기 5종(X · 다운스와이프 · backdrop · ESC · 뒤로가기) 전부 URL 복귀로 수렴 → router.back().
 *   (인터셉트로 열렸으므로 back() 하면 /community 로 돌아가고 리스트 상태 유지.)
 *
 * 재사용: 다른 타입(FAQ 등)은 parallel-route 세그먼트 + 상세 컴포넌트만 추가하고
 *         이 컨테이너로 감싸면 동일 동작을 얻는다.
 */
export default function DetailContainer({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const isMobile = useIsMobile()
  const close = () => router.back()

  // 데스크탑: 인라인 (Extended 페인이 스크롤 담당)
  if (!isMobile) {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={close}
          aria-label="닫기"
          className="absolute -top-1 right-0 z-10 rounded-full p-1.5 text-[#64748b] hover:bg-[#f1f5f9]"
        >
          <X size={20} />
        </button>
        {children}
      </div>
    )
  }

  // 모바일: vaul 하단 시트 (Portal → body 라서 hidden md:block 부모를 탈출)
  return (
    <Drawer.Root
      open
      onOpenChange={(o) => {
        if (!o) close()
      }}
    >
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-[60] bg-black/40" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-[60] mt-24 flex h-fit max-h-[85vh] flex-col rounded-t-[10px] bg-white outline-none">
          <Drawer.Title className="sr-only">상세 보기</Drawer.Title>
          <div aria-hidden className="mx-auto mt-3 h-1.5 w-12 shrink-0 rounded-full bg-zinc-300" />
          <div className="flex justify-end px-3 pt-1">
            <button
              type="button"
              onClick={close}
              aria-label="닫기"
              className="rounded-full p-1.5 text-[#64748b] hover:bg-[#f1f5f9]"
            >
              <X size={20} />
            </button>
          </div>
          <div className="overflow-y-auto px-5 pb-8 [container-type:inline-size]">{children}</div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
