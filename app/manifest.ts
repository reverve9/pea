import type { MetadataRoute } from 'next'

// PWA 매니페스트 — /manifest.webmanifest 로 서빙(Next가 <link rel=manifest> 자동 삽입).
// 아이콘=새 CI 심볼(_ref/260819_체육교육회로고_outline.ai, 흰 배경 정사각, ?v=2 캐시버스트). theme=네이비 / bg=화이트.
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
      { src: '/icons/icon-192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-192.png?v=2', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
      { src: '/icons/icon-512.png?v=2', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
