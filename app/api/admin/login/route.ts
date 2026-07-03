import { NextResponse } from 'next/server'
import {
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
  ADMIN_COOKIE,
  ADMIN_SESSION_TOKEN,
  ADMIN_SESSION_MAX_AGE,
} from '@/lib/adminAuth'

// 어드민 로그인 — 하드코딩 자격증명 검증 후 httpOnly 세션 쿠키 발급(MVP).
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const username = typeof body.username === 'string' ? body.username : ''
  const password = typeof body.password === 'string' ? body.password : ''

  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    return NextResponse.json(
      { error: '아이디 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    )
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, ADMIN_SESSION_TOKEN, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_MAX_AGE,
  })
  return res
}
