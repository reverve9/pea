import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE, verifyAdminSession } from '@/lib/adminAuth'

// /admin/* 게이트. 로그인 페이지만 통과, 나머지는 서명 세션 쿠키가 유효하지 않으면 로그인으로 리다이렉트.
// admin_users 재확인은 패널 레이아웃·requireAdmin(lib/adminGuard)이 한다.
export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl

  if (pathname === '/admin/login') return NextResponse.next()

  const authed = await verifyAdminSession(req.cookies.get(ADMIN_COOKIE)?.value)
  if (!authed) {
    const url = req.nextUrl.clone()
    url.pathname = '/admin/login'
    url.searchParams.set('from', pathname)
    return NextResponse.redirect(url)
  }
  return NextResponse.next()
}

export const config = { matcher: ['/admin', '/admin/:path*'] }
