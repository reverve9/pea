'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { decryptSecret, issueFillToken } from '@/lib/serverCrypto'
import { updateParticipantDetail as applyParticipantDetail, type ParticipantDetailInput } from '@/lib/participantDetail'
import type { ApplicationStatus, InsuranceRosterEntry } from '@/lib/types'

// 신청 관리 서버 액션 — requireAdmin 후 service_role 로 RLS 우회.
export type ActionResult = { ok: true } | { ok: false; error: string }

const STATUSES: ApplicationStatus[] = ['pending', 'paid', 'completed', 'cancelled', 'refunded']

// 상태 변경 — pending→paid→completed / cancel / refund.
// paid 로 전환 시 deposit_confirmed_at 을 찍는다(통장대조 완료 시각). 되돌리면 비운다.
export async function setApplicationStatus(id: string, status: ApplicationStatus): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (!STATUSES.includes(status)) return { ok: false, error: '알 수 없는 상태입니다.' }
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    patch.deposit_confirmed_at = status === 'paid' ? new Date().toISOString() : null
    const { error } = await supabaseAdmin.from('applications').update(patch).eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    return { ok: true }
  } catch (e) {
    console.error('[applications] setStatus:', e)
    return { ok: false, error: '상태 변경에 실패했습니다.' }
  }
}

// 입금완료 신고 해제(반려) — payment_claimed_at·payment_claim_name 비우기.
// 허위/오클릭 정리 + 사용자 재요청 락아웃 해소([[payment-claim-policy]]). status 는 건드리지 않는다.
export async function releasePaymentClaim(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin
      .from('applications')
      .update({ payment_claimed_at: null, payment_claim_name: null, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    return { ok: true }
  } catch (e) {
    console.error('[applications] releaseClaim:', e)
    return { ok: false, error: '신고 해제에 실패했습니다.' }
  }
}

// 참가자 상세(성함·연락처·생년월일·성별·뒷자리·기초강습·장비·의류사이즈) 어드민 수기 입력.
// 유선/동반인 확인 후 대신 입력. 셀프필과 동일 로직(participantDetail) 공유.
export async function updateParticipantDetail(
  participantId: string,
  input: ParticipantDetailInput,
): Promise<ActionResult> {
  try {
    await requireAdmin()
    const res = await applyParticipantDetail(participantId, input)
    if (!res.ok) return res
    revalidatePath('/admin/applications')
    return { ok: true }
  } catch (e) {
    console.error('[applications] updateParticipantDetail:', e)
    return { ok: false, error: '저장에 실패했습니다.' }
  }
}

// 셀프필 링크 발급(어드민) — 동반인 후속입력용 링크 토큰. 관리자가 대표에게 안내/공유.
export type FillLinkResult = { ok: true; fillToken: string } | { ok: false; error: string }
export async function issueFillLink(applicationId: string): Promise<FillLinkResult> {
  try {
    await requireAdmin()
    return { ok: true, fillToken: issueFillToken(applicationId, Date.now()) }
  } catch (e) {
    console.error('[applications] issueFillLink:', e)
    return { ok: false, error: '링크 발급에 실패했습니다.' }
  }
}

// 관리자 메모 저장(내부용). 빈 값이면 null.
export async function saveAdminMemo(id: string, memo: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const trimmed = memo.trim()
    const { error } = await supabaseAdmin
      .from('applications')
      .update({ admin_memo: trimmed || null, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    return { ok: true }
  } catch (e) {
    console.error('[applications] saveMemo:', e)
    return { ok: false, error: '메모 저장에 실패했습니다.' }
  }
}

// 보험명단 뒷자리 온디맨드 복호 — 관리자가 상세에서 "뒷자리 표시" 눌렀을 때만 복호해 반환.
// 목록/상세 기본 데이터엔 뒷자리를 절대 싣지 않는다(민감정보 노출 최소화).
export type RosterResult = { ok: true; roster: InsuranceRosterEntry[] } | { ok: false; error: string }
export async function revealInsuranceRoster(applicationId: string): Promise<RosterResult> {
  try {
    await requireAdmin()
    const { data, error } = await supabaseAdmin
      .from('participants')
      .select('id, name, birth_front, birth_back_enc, sort_order')
      .eq('application_id', applicationId)
      .not('birth_back_enc', 'is', null)
      .order('sort_order', { ascending: true })
    if (error) throw error
    const roster: InsuranceRosterEntry[] = ((data as { id: string; name: string; birth_front: string | null; birth_back_enc: string }[]) ?? []).map((p) => {
      let birth_back = ''
      try {
        birth_back = decryptSecret(p.birth_back_enc)
      } catch (err) {
        console.error('[applications] decrypt 뒷자리:', err)
        birth_back = '(복호 실패)'
      }
      return { id: p.id, name: p.name, birth_front: p.birth_front, birth_back }
    })
    return { ok: true, roster }
  } catch (e) {
    console.error('[applications] revealRoster:', e)
    return { ok: false, error: '보험명단 조회에 실패했습니다.' }
  }
}
