import 'server-only'
import { createClient } from '@supabase/supabase-js'

// 어드민 전용 service_role 클라이언트 — RLS 를 전면 우회한다.
// ⚠ 반드시 서버(서버 컴포넌트·서버 액션·라우트 핸들러)에서만 사용. 'server-only' 가
//    클라 번들 유입을 컴파일 타임에 차단한다. service_role 키는 절대 NEXT_PUBLIC_ 금지.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !serviceKey) {
  throw new Error(
    'Missing Supabase admin env. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (no NEXT_PUBLIC_ prefix) in .env.local',
  )
}

export const supabaseAdmin = createClient(url, serviceKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
