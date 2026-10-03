import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE, signAdminSession } from '@/lib/adminAuth'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// 어드민 로그인 — Supabase Auth 이메일/비밀번호 확인 → admin_users 등록 여부 확인 → 서명 세션 쿠키 발급.
// 계정 추가는 Supabase 대시보드(Authentication 에서 사용자 생성 + admin_users 에 user_id 등록). db/33_admin_users.sql 참고.
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}))
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const password = typeof body.password === 'string' ? body.password : ''
  if (!email || !password) {
    return NextResponse.json({ error: '이메일과 비밀번호를 입력해 주세요.' }, { status: 400 })
  }

  // 요청마다 새 클라이언트 — 세션을 서버에 저장하지 않는다.
  const auth = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )
  const { data, error } = await auth.auth.signInWithPassword({ email, password })
  if (error || !data.user) {
    return NextResponse.json(
      { error: '이메일 또는 비밀번호가 올바르지 않습니다.' },
      { status: 401 },
    )
  }
  // Supabase 세션은 확인용으로만 쓰고 바로 폐기(이후 인증은 어드민 쿠키로).
  await auth.auth.signOut({ scope: 'local' }).catch(() => {})

  const { data: admin, error: adminErr } = await supabaseAdmin
    .from('admin_users')
    .select('user_id')
    .eq('user_id', data.user.id)
    .maybeSingle()
  if (adminErr) {
    return NextResponse.json({ error: '관리자 확인 중 오류가 발생했습니다.' }, { status: 500 })
  }
  if (!admin) {
    return NextResponse.json({ error: '관리자 권한이 없는 계정입니다.' }, { status: 403 })
  }

  const res = NextResponse.json({ ok: true })
  res.cookies.set(ADMIN_COOKIE, await signAdminSession(data.user.id, data.user.email ?? email), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
    maxAge: ADMIN_SESSION_MAX_AGE,
  })
  return res
}
