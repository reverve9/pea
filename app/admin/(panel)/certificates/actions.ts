'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin } from '@/lib/supabaseAdmin'

// 증명서(수료증) 발급 서버 액션 — requireAdmin 후 service_role.
// 발급 = certificate_requests 원장에 completion row insert / 취소 = 해당 row delete.
export type ActionResult = { ok: true } | { ok: false; error: string }

// 수료증 발급 — participant_id 만 받고 신청 컨텍스트(신청ID·연락처·이름)는 서버가 조회(클라 위조 방지).
// 연수완료 상태만 발급 가능. 이미 발급됐으면(유니크 위반) 정상 처리.
export async function issueCertificate(participantId: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { data: p, error: pErr } = await supabaseAdmin
      .from('participants')
      .select('id, name, application:applications(id, phone, status)')
      .eq('id', participantId)
      .maybeSingle()
    if (pErr) throw pErr
    if (!p) return { ok: false, error: '참가자를 찾을 수 없습니다.' }

    const appRaw = (p as { application: unknown }).application
    const app = (Array.isArray(appRaw) ? appRaw[0] : appRaw) as { id: string; phone: string; status: string } | null
    if (!app) return { ok: false, error: '연결된 신청을 찾을 수 없습니다.' }
    if (app.status !== 'completed') return { ok: false, error: '연수완료 상태만 발급할 수 있습니다.' }

    const { error } = await supabaseAdmin.from('certificate_requests').insert({
      application_id: app.id,
      participant_id: participantId,
      phone: app.phone,
      name: (p as { name: string }).name,
      cert_type: 'completion',
      status: 'done',
    })
    // 23505 = 유니크 위반(이미 발급) → 성공으로 간주(멱등)
    if (error && error.code !== '23505') throw error
    revalidatePath('/admin/certificates')
    return { ok: true }
  } catch (e) {
    console.error('[certificates] issue:', e)
    return { ok: false, error: '발급에 실패했습니다.' }
  }
}

// 발급 취소 — 원장 row 삭제(오발급 정리 / 재발급 가능하게).
export async function revokeCertificate(certificateId: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin.from('certificate_requests').delete().eq('id', certificateId)
    if (error) throw error
    revalidatePath('/admin/certificates')
    return { ok: true }
  } catch (e) {
    console.error('[certificates] revoke:', e)
    return { ok: false, error: '발급 취소에 실패했습니다.' }
  }
}

// ── 현금영수증 수기 발급처리 ─────────────────────────────────────────────
// 팝빌 실연동 전 백업 경로(+연동 후에도 실패건 복구용). 어드민이 홈택스/팝빌에서 직접 발급하고
// 승인번호를 입력하면 원장(cash_receipts)을 확정한다. 원장에 없는 건은 만들지 않음(발급은 입금확인이 트리거).
// 완료 상태 = status 'issued' + issued_at. 취소발급(kind='cancel')도 같은 완료 상태를 쓰되 cancelled_at 을 함께 찍는다.
// [[cash-receipt-spec]]

// 승인번호 확정 — 발급대기·실패건을 발급완료로, 이미 발급된 건은 승인번호 정정(오타 복구).
export async function markCashReceiptIssued(receiptId: string, approvalNo: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const no = approvalNo.trim()
    if (no.length < 4) return { ok: false, error: '승인번호를 확인해 주세요.' }

    const { data: r, error: selErr } = await supabaseAdmin
      .from('cash_receipts')
      .select('id, kind, status, issued_at')
      .eq('id', receiptId)
      .maybeSingle()
    if (selErr) throw selErr
    if (!r) return { ok: false, error: '발급 내역을 찾을 수 없습니다.' }

    const now = new Date().toISOString()
    const { error } = await supabaseAdmin
      .from('cash_receipts')
      .update({
        status: 'issued',
        approval_no: no,
        issued_at: r.issued_at ?? now, // 정정 시 최초 발급일 보존
        ...(r.kind === 'cancel' ? { cancelled_at: r.issued_at ?? now } : {}),
      })
      .eq('id', receiptId)
    if (error) throw error
    revalidatePath('/admin/certificates')
    return { ok: true }
  } catch (e) {
    console.error('[cashReceipt] markIssued:', e)
    return { ok: false, error: '발급처리에 실패했습니다.' }
  }
}

// 실패 처리 — 발급 불가(식별번호 오류 등)로 확정. 다시 발급되면 위 액션으로 되살릴 수 있다.
export async function markCashReceiptFailed(receiptId: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin
      .from('cash_receipts')
      .update({ status: 'failed' })
      .eq('id', receiptId)
      .eq('status', 'pending')
    if (error) throw error
    revalidatePath('/admin/certificates')
    return { ok: true }
  } catch (e) {
    console.error('[cashReceipt] markFailed:', e)
    return { ok: false, error: '실패 처리에 실패했습니다.' }
  }
}
