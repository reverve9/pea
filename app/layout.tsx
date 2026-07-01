import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: '체육교육회',
  description: '체육교육회 연수 신청 플랫폼',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
