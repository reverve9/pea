import 'server-only'
import { cookies } from 'next/headers'
import { ADMIN_COOKIE, ADMIN_SESSION_TOKEN } from './adminAuth'

// 서버 액션/라우트에서 어드민 세션 재검증 — 미들웨어 게이트에 더해 방어적으로 한 번 더 확인.
// 세션 없으면 throw → 서버 액션은 에러로 종료(mutation 미실행).
export async function requireAdmin(): Promise<void> {
  const store = await cookies()
  if (store.get(ADMIN_COOKIE)?.value !== ADMIN_SESSION_TOKEN) {
    throw new Error('UNAUTHORIZED')
  }
}
