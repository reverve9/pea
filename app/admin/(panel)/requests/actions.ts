'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { RefundStatus, ModificationStatus } from '@/lib/types'

// 요청 관리 서버 액션 — requireAdmin 후 service_role 로 RLS 우회.
export type ActionResult = { ok: true } | { ok: false; error: string }

const REFUND_STATUSES: RefundStatus[] = ['requested', 'confirmed', 'completed']
const MODIFICATION_STATUSES: ModificationStatus[] = ['pending', 'confirmed', 'done', 'rejected']

// ── 환불 요청 ──
export async function setRefundStatus(id: string, status: RefundStatus): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (!REFUND_STATUSES.includes(status)) return { ok: false, error: '알 수 없는 상태입니다.' }
    const { error } = await supabaseAdmin
      .from('refund_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/requests')
    return { ok: true }
  } catch (e) {
    console.error('[requests] setRefundStatus:', e)
    return { ok: false, error: '상태 변경에 실패했습니다.' }
  }
}

export async function saveRefundMemo(id: string, memo: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const trimmed = memo.trim()
    const { error } = await supabaseAdmin
      .from('refund_requests')
      .update({ admin_memo: trimmed || null, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/requests')
    return { ok: true }
  } catch (e) {
    console.error('[requests] saveRefundMemo:', e)
    return { ok: false, error: '메모 저장에 실패했습니다.' }
  }
}

// ── 수정 요청 ──
export async function setModificationStatus(id: string, status: ModificationStatus): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (!MODIFICATION_STATUSES.includes(status)) return { ok: false, error: '알 수 없는 상태입니다.' }
    const { error } = await supabaseAdmin
      .from('modification_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/requests')
    return { ok: true }
  } catch (e) {
    console.error('[requests] setModificationStatus:', e)
    return { ok: false, error: '상태 변경에 실패했습니다.' }
  }
}

// 답글 저장 — 작성자에게 표시(마이페이지 열람). 내용은 상태를 자동 전환하지 않는다(상태는 별도 버튼).
export async function replyModification(id: string, reply: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const trimmed = reply.trim()
    const { error } = await supabaseAdmin
      .from('modification_requests')
      .update({ admin_reply: trimmed || null, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/requests')
    return { ok: true }
  } catch (e) {
    console.error('[requests] replyModification:', e)
    return { ok: false, error: '답글 저장에 실패했습니다.' }
  }
}
