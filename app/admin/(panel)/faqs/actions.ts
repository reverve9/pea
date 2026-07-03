'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// FAQ CRUD 서버 액션 — requireAdmin 후 service_role 로 RLS 우회.
export interface FaqInput {
  question: string
  content: string
  sort_order: number
  is_published: boolean
}

export type ActionResult = { ok: true } | { ok: false; error: string }

function clean(input: FaqInput) {
  return {
    question: input.question.trim(),
    content: input.content.trim(),
    sort_order: Number.isFinite(input.sort_order) ? input.sort_order : 0,
    is_published: input.is_published,
  }
}

export async function createFaq(input: FaqInput): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin.from('faqs').insert(clean(input))
    if (error) throw error
    revalidatePath('/admin/faqs')
    return { ok: true }
  } catch (e) {
    console.error('[faqs] create:', e)
    return { ok: false, error: 'FAQ 저장에 실패했습니다.' }
  }
}

export async function updateFaq(id: string, input: FaqInput): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin
      .from('faqs')
      .update({ ...clean(input), updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/faqs')
    return { ok: true }
  } catch (e) {
    console.error('[faqs] update:', e)
    return { ok: false, error: 'FAQ 수정에 실패했습니다.' }
  }
}

export async function deleteFaq(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin.from('faqs').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/admin/faqs')
    return { ok: true }
  } catch (e) {
    console.error('[faqs] delete:', e)
    return { ok: false, error: '삭제에 실패했습니다.' }
  }
}
