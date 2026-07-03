'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { NoticeCategory } from '@/lib/types'

// 공지 CRUD 서버 액션 — requireAdmin(쿠키 재검증) 후 service_role 로 RLS 우회.
export interface NoticeInput {
  title: string
  content: string
  category: NoticeCategory
  is_pinned: boolean
  is_published: boolean
}

export type ActionResult = { ok: true } | { ok: false; error: string }

function clean(input: NoticeInput) {
  return {
    title: input.title.trim(),
    content: input.content.trim(),
    category: input.category,
    is_pinned: input.is_pinned,
    is_published: input.is_published,
  }
}

export async function createNotice(input: NoticeInput): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin.from('notices').insert({
      ...clean(input),
      published_at: input.is_published ? new Date().toISOString() : null,
    })
    if (error) throw error
    revalidatePath('/admin/notices')
    return { ok: true }
  } catch (e) {
    console.error('[notices] create:', e)
    return { ok: false, error: '공지 저장에 실패했습니다.' }
  }
}

export async function updateNotice(id: string, input: NoticeInput): Promise<ActionResult> {
  try {
    await requireAdmin()
    // 발행 상태 전환 시 published_at 보정 — 최초 발행 시각을 보존한다.
    const { data: row } = await supabaseAdmin
      .from('notices')
      .select('published_at')
      .eq('id', id)
      .maybeSingle()
    const prev = (row?.published_at as string | null) ?? null
    const published_at = input.is_published ? (prev ?? new Date().toISOString()) : prev
    const { error } = await supabaseAdmin
      .from('notices')
      .update({ ...clean(input), published_at, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/notices')
    return { ok: true }
  } catch (e) {
    console.error('[notices] update:', e)
    return { ok: false, error: '공지 수정에 실패했습니다.' }
  }
}

export async function deleteNotice(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin.from('notices').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/admin/notices')
    return { ok: true }
  } catch (e) {
    console.error('[notices] delete:', e)
    return { ok: false, error: '삭제에 실패했습니다.' }
  }
}
