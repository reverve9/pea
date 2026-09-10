'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { PRIVACY_KEY } from './policyKeys'

// 개인정보처리방침 등 정책 문서 저장 — site_contents 의 단일 행(body) 갱신.
// 공지·FAQ 와 달리 문서 한 장이라 CRUD 없이 '덮어쓰기'만. 본문은 마크다운(공개 페이지에서 렌더).
// requireAdmin(쿠키 재검증) 후 service_role. [[admin-mutation-architecture]]
export type ActionResult = { ok: true } | { ok: false; error: string }

export async function savePolicy(key: string, body: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (key !== PRIVACY_KEY) return { ok: false, error: '알 수 없는 문서입니다.' }

    // 행이 없을 수도 있어 upsert(키 기준). 제목은 고정값으로 채운다.
    const { error } = await supabaseAdmin
      .from('site_contents')
      .upsert({ key, title: '개인정보처리방침', body: body.trim(), sort_order: 90 }, { onConflict: 'key' })
    if (error) throw error
    revalidatePath('/admin/board')
    revalidatePath('/privacy')
    return { ok: true }
  } catch (e) {
    console.error('[policy] save:', e)
    return { ok: false, error: '저장에 실패했습니다.' }
  }
}
