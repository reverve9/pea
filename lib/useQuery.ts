'use client'

import { useEffect, useState } from 'react'

// 브라우저 anon 클라이언트로 읽는 쿼리를 감싸는 최소 훅.
// 마운트 시 1회 실행, {data, loading} 반환. 읽기 전용이라 재요청/뮤테이션 없음.
// fetcher 는 queries.ts 의 함수(getCourses 등). 실패는 fetcher 내부에서 []·null 로 흡수.
export function useQuery<T>(fetcher: () => Promise<T>, initial: T): { data: T; loading: boolean } {
  const [data, setData] = useState<T>(initial)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let alive = true
    fetcher()
      .then((res) => {
        if (alive) setData(res)
      })
      .finally(() => {
        if (alive) setLoading(false)
      })
    return () => {
      alive = false
    }
    // fetcher 는 모듈 최상위 함수라 안정적 — 마운트 1회만 실행
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return { data, loading }
}
