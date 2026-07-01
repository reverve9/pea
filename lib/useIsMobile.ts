'use client'

import { useEffect, useState } from 'react'

// <768 뷰포트 여부. 상세 컨테이너가 데스크탑 인라인 / 모바일 드로어를 가르는 데 사용.
// SSR 초기값 false(데스크탑) → 마운트 후 보정.
export function useIsMobile(breakpoint = 768): boolean {
  const [isMobile, setIsMobile] = useState(false)
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < breakpoint)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [breakpoint])
  return isMobile
}
