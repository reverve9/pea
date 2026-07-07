'use client'

import { useEffect } from 'react'

// 서비스워커 등록 — PWA 설치 가능성(Android) 확보. 실패해도 무시(설치 안내는 별도 UI).
export default function ServiceWorkerRegister() {
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {})
    }
  }, [])
  return null
}
