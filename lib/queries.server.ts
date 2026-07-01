import 'server-only'
import { supabaseServer } from './supabaseServer'
import type { Notice } from './types'

// 서버 컴포넌트 전용 단건 조회 (상세 인터셉트 + 풀페이지 공용).
// RLS 가 is_published=true 만 노출 → 미공개/없는 id 는 null.
export async function getNoticeById(id: string): Promise<Notice | null> {
  const { data, error } = await supabaseServer
    .from('notices')
    .select('id, title, content, category, is_pinned, published_at, created_at')
    .eq('id', id)
    .maybeSingle()
  if (error) console.warn(`[queries.server] getNoticeById(${id}):`, error)
  return (data as Notice) ?? null
}
