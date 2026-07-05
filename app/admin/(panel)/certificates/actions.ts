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
