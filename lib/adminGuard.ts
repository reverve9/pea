import 'server-only'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, verifyAdminSession, type AdminSession } from './adminAuth'
import { supabaseAdmin } from './supabaseAdmin'

// 쿠키 서명 확인 + admin_users 재조회. 관리자에서 빠진 계정은 세션이 남아 있어도 즉시 차단된다.
export async function getAdminSession(): Promise<AdminSession | null> {
  const store = await cookies()
  const session = await verifyAdminSession(store.get(ADMIN_COOKIE)?.value)
  if (!session) return null
  const { data, error } = await supabaseAdmin
    .from('admin_users')
    .select('user_id')
    .eq('user_id', session.uid)
    .maybeSingle()
  if (error || !data) return null
  return session
}

// 서버 액션/라우트에서 어드민 세션 재검증 — 미들웨어 게이트에 더해 방어적으로 한 번 더 확인.
// 세션 없으면 throw → 서버 액션은 에러로 종료(mutation 미실행).
export async function requireAdmin(): Promise<void> {
  if (!(await getAdminSession())) {
    throw new Error('UNAUTHORIZED')
  }
}
