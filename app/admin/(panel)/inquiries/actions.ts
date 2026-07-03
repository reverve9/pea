'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// 문의 답변/삭제 서버 액션 — requireAdmin 후 service_role 로 RLS 우회.
export type ActionResult = { ok: true } | { ok: false; error: string }

// 답변 저장 — 내용이 있으면 상태 '답변완료(answered)', 비우면 '대기(open)'로 되돌린다.
export async function replyInquiry(id: string, reply: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const trimmed = reply.trim()
    const { error } = await supabaseAdmin
      .from('inquiries')
      .update({
        admin_reply: trimmed || null,
        status: trimmed ? 'answered' : 'open',
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/inquiries')
    return { ok: true }
  } catch (e) {
    console.error('[inquiries] reply:', e)
    return { ok: false, error: '답변 저장에 실패했습니다.' }
  }
}

export async function deleteInquiry(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin.from('inquiries').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/admin/inquiries')
    return { ok: true }
  } catch (e) {
    console.error('[inquiries] delete:', e)
    return { ok: false, error: '삭제에 실패했습니다.' }
  }
}
