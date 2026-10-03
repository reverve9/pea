// 어드민 세션 — 엣지(middleware)·서버(route) 공용. Node 전용 import 금지(엣지에서 로드됨, Web Crypto 만 사용).
//
// 로그인은 Supabase Auth(이메일+비밀번호)로 확인하고, admin_users 에 등록된 계정만 통과(app/api/admin/login).
// 통과하면 {uid, email, exp} 를 HMAC-SHA256 으로 서명한 httpOnly 쿠키를 발급한다.
// 서명키는 SUPABASE_SERVICE_ROLE_KEY 에서 파생 — 별도 환경변수 불필요. 서비스키를 교체하면 기존 세션은 모두 무효.
// 미들웨어는 서명·만료만 확인(DB 조회 없음), 패널 레이아웃·서버 액션은 lib/adminGuard 에서 admin_users 를 다시 확인한다.

export const ADMIN_COOKIE = 'pea_admin'
// 세션 유지(초). 8시간.
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8

export type AdminSession = { uid: string; email: string; exp: number }

const enc = new TextEncoder()

function b64url(bytes: Uint8Array): string {
  let s = ''
  for (const b of bytes) s += String.fromCharCode(b)
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Uint8Array {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'))
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

async function hmacKey(): Promise<CryptoKey> {
  const secret = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!secret) throw new Error('SUPABASE_SERVICE_ROLE_KEY 미설정 — 어드민 세션 서명 불가')
  return crypto.subtle.importKey(
    'raw',
    enc.encode(`pea-admin-session:v1:${secret}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign', 'verify'],
  )
}

// 토큰 포맷: {payload_b64url}.{sig_b64url}
export async function signAdminSession(uid: string, email: string): Promise<string> {
  const session: AdminSession = {
    uid,
    email,
    exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_MAX_AGE,
  }
  const payload = b64url(enc.encode(JSON.stringify(session)))
  const sig = await crypto.subtle.sign('HMAC', await hmacKey(), enc.encode(payload))
  return `${payload}.${b64url(new Uint8Array(sig))}`
}

// 서명·만료 확인. 위조·만료·형식 오류는 모두 null.
export async function verifyAdminSession(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null
  const [payload, sig] = token.split('.')
  if (!payload || !sig) return null
  try {
    const ok = await crypto.subtle.verify(
      'HMAC',
      await hmacKey(),
      fromB64url(sig) as BufferSource,
      enc.encode(payload),
    )
    if (!ok) return null
    const s = JSON.parse(new TextDecoder().decode(fromB64url(payload))) as AdminSession
    if (typeof s.uid !== 'string' || typeof s.email !== 'string' || typeof s.exp !== 'number') return null
    if (s.exp <= Math.floor(Date.now() / 1000)) return null
    return s
  } catch {
    return null
  }
}
