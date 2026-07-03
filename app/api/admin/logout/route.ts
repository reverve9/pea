import { NextResponse } from 'next/server'
import { ADMIN_COOKIE } from '@/lib/adminAuth'

// 어드민 로그아웃 — 세션 쿠키 제거.
export async function POST() {
  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
