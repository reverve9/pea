import type { MetadataRoute } from 'next'

// PWA 매니페스트 — /manifest.webmanifest 로 서빙(Next가 <link rel=manifest> 자동 삽입).
// 아이콘=헤더 로고 엠블럼(흰 배경 정사각, _DEV/bake_pwa_icons.py). theme=네이비 / bg=화이트.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '체육교육회',
    short_name: '체육교육회',
    description: '체육교육회 연수 신청 플랫폼',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#1e3a5f',
    lang: 'ko',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
