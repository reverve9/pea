import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE, ADMIN_SESSION_TOKEN } from '@/lib/adminAuth'

// /admin/* 게이트. 로그인 페이지만 통과, 나머지는 세션 쿠키 없으면 로그인으로 리다이렉트.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname === '/admin/login') return NextResponse.next()

  const authed = req.cookies.get(ADMIN_COOKIE)?.value === ADMIN_SESSION_TOKEN
  if (!authed) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/admin', '/admin/:path*'] }
