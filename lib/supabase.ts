import { createClient } from '@supabase/supabase-js'

// 브라우저용 anon 클라이언트. service_role 클라이언트는 후속 /api Phase에서 별도 생성.
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local',
  )
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)
