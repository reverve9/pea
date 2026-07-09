import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // lucide-react 배럴 named import 46곳 → 아이콘 개별 경로로 자동 변환(dev 컴파일·번들 그래프 경감).
  experimental: {
    optimizePackageImports: ['lucide-react'],
  },
  // next/image 최적화 포맷: avif 우선(webp 폴백). 로고 등 next/image 대상에 적용.
  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
