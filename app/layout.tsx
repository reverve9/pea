import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerRegister from '@/components/layout/ServiceWorkerRegister'

export const metadata: Metadata = {
  title: '체육교육회',
  description: '체육교육회 연수 신청 플랫폼',
  applicationName: '체육교육회',
  // iOS 홈화면 앱(전체화면 standalone) + 상태바.
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: '체육교육회',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#1e3a5f',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  )
}
