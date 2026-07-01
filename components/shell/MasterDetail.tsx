'use client'

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { X } from 'lucide-react'

/**
 * 범용 master-detail 셸 (§3-5).
 * 나인브릿지 NEWS(PWANotice → ExtendedContent)의 "좌측 리스트 → 우측 상세" 패턴을
 * 데이터 비의존 셸로 추출. AppShell 두 페인에 맞춰 context 로 선택 상태를 공유한다:
 *   - <MasterDetailList>  → AppShell main (PWA 페인, 카드 리스트)
 *   - <MasterDetailDetail> → AppShell extended (데스크탑 우측 상세) + 모바일 모달
 * 이번 Phase 는 셸(레이아웃·선택상태·빈 상태 UI)만. 실제 데이터 바인딩은 2b.
 *
 * 사용:
 *   <MasterDetailProvider>
 *     <AppShell
 *       main={<MasterDetailList items={...} getKey={...} renderCard={...} header={...} />}
 *       extended={<MasterDetailDetail items={...} getKey={...} renderDetail={...} />}
 *     />
 *   </MasterDetailProvider>
 */

interface MasterDetailCtx {
  selectedKey: string | null
  select: (key: string) => void
  clear: () => void
}

const Ctx = createContext<MasterDetailCtx | null>(null)

function useMasterDetail(): MasterDetailCtx {
  const ctx = useContext(Ctx)
  if (!ctx) throw new Error('MasterDetail components must be used within <MasterDetailProvider>')
  return ctx
}

export function MasterDetailProvider({ children }: { children: ReactNode }) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null)
  return (
    <Ctx.Provider
      value={{ selectedKey, select: setSelectedKey, clear: () => setSelectedKey(null) }}
    >
      {children}
    </Ctx.Provider>
  )
}

// <768 여부 (모바일 상세는 모달, 데스크탑은 우측 페인)
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])
  return isMobile
}

interface ListProps<T> {
  items: T[]
  getKey: (item: T) => string
  renderCard: (item: T, opts: { selected: boolean }) => ReactNode
  header?: ReactNode
  emptyLabel?: string
}

// 좌측 리스트 (PWA 페인). 카드 클릭 → 선택. 빈 상태 UI 포함.
export function MasterDetailList<T>({
  items,
  getKey,
  renderCard,
  header,
  emptyLabel = '등록된 항목이 없습니다.',
}: ListProps<T>) {
  const { selectedKey, select } = useMasterDetail()
  return (
    <div className="relative min-h-full">
      {header}
      <div className="px-4 py-2 space-y-3 pb-4">
        {items.length === 0 ? (
          <p className="fluid-body text-[#9ca3af] py-8 text-center">{emptyLabel}</p>
        ) : (
          items.map((item) => {
            const key = getKey(item)
            const selected = selectedKey === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => select(key)}
                aria-current={selected ? 'true' : undefined}
                className="block w-full text-left"
              >
                {renderCard(item, { selected })}
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}

interface DetailProps<T> {
  items: T[]
  getKey: (item: T) => string
  renderDetail: (item: T) => ReactNode
  placeholder?: ReactNode
  // 렌더 범위: 'both'(기본) | 'desktop'(인라인만) | 'mobile'(모달만).
  // AppShell 의 extended 슬롯은 `hidden md:block` 이라 그 안에서는 모바일 모달이
  // display:none 조상에 갇힌다 → extended 엔 variant="desktop", 모바일 가시 영역엔
  // variant="mobile" 로 나눠 배치한다.
  variant?: 'both' | 'desktop' | 'mobile'
}

// 상세: 데스크탑은 우측 확장 페인에 인라인, 모바일은 하단 모달.
export function MasterDetailDetail<T>({
  items,
  getKey,
  renderDetail,
  placeholder,
  variant = 'both',
}: DetailProps<T>) {
  const { selectedKey, clear } = useMasterDetail()
  const isMobile = useIsMobile()
  const selectedItem = items.find((it) => getKey(it) === selectedKey) ?? null

  // 데스크탑 우측 페인
  const desktop = (
    <div className="hidden md:block">
      {selectedItem ? (
        renderDetail(selectedItem)
      ) : (
        placeholder ?? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-[#9ca3af]">
            <p className="fluid-body">좌측에서 항목을 선택하세요.</p>
          </div>
        )
      )}
    </div>
  )

  // 모바일 모달
  const mobileModal =
    isMobile && selectedItem ? (
      <div
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-5 md:hidden"
        onClick={clear}
      >
        <div
          className="bg-white w-full max-h-[80vh] rounded-[16px] overflow-hidden flex flex-col shadow-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white px-4 py-3 border-b border-[#e5e7eb] flex items-center justify-end z-10">
            <button onClick={clear} className="p-1 hover:bg-[#f3f4f6] rounded-full" aria-label="닫기">
              <X size={22} className="text-[#6b7280]" />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-4">{renderDetail(selectedItem)}</div>
        </div>
      </div>
    ) : null

  return (
    <>
      {variant !== 'mobile' && desktop}
      {variant !== 'desktop' && mobileModal}
    </>
  )
}
