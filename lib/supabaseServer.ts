import { createClient } from '@supabase/supabase-js'

// 서버 컴포넌트용 anon 클라이언트 (공개 읽기 전용).
// 브라우저 싱글턴(lib/supabase.ts)과 달리 세션 저장/자동갱신을 끈다(서버엔 localStorage 없음).
// anon 키는 공개키라 서버에서 사용해도 안전. mutation 없음(SELECT only).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / _ANON_KEY)')
}

export const supabaseServer = createClient(supabaseUrl, supabaseAnonKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
