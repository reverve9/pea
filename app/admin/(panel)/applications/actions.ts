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
// deposit_confirmed_at = 통장대조(입금확인) 시각. paid 로 전환 시 찍고, pending 으로 되돌리면 비운다.
// completed/refunded 로 진행 시엔 그대로 보존한다(정산 기준일 = 입금확인일이므로 유실 금지).
export async function setApplicationStatus(id: string, status: ApplicationStatus): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (!STATUSES.includes(status)) return { ok: false, error: '알 수 없는 상태입니다.' }
    const patch: Record<string, unknown> = { status, updated_at: new Date().toISOString() }
    if (status === 'paid') patch.deposit_confirmed_at = new Date().toISOString()
    else if (status === 'pending') patch.deposit_confirmed_at = null
    // completed/cancelled/refunded: deposit_confirmed_at 유지
    const { error } = await supabaseAdmin.from('applications').update(patch).eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    return { ok: true }
  } catch (e) {
    console.error('[applications] setStatus:', e)
    return { ok: false, error: '상태 변경에 실패했습니다.' }
  }
}

// 환불 처리 — status=refunded + 환불 확정액(관리자 수기 설정) 저장.
// 환불규정이 상황별로 달라 금액이 가변 → 자동 계산이 아니라 입력값을 그대로 환불(PG 환불도 동일).
// deposit_confirmed_at 은 setApplicationStatus 와 동일하게 유지(정산 기준일 유실 방지).
export async function setApplicationRefund(id: string, amount: number): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (!Number.isFinite(amount) || amount < 0 || !Number.isInteger(amount)) {
      return { ok: false, error: '환불 금액이 올바르지 않습니다.' }
    }
    const { error } = await supabaseAdmin
      .from('applications')
      .update({ status: 'refunded', refunded_amount: amount, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    revalidatePath('/admin/settlements')
    return { ok: true }
  } catch (e) {
    console.error('[applications] setRefund:', e)
    return { ok: false, error: '환불 처리에 실패했습니다.' }
  }
}

// 소프트 정원 대기 처리 — 승인=대기 해제(is_waitlisted=false, 정원 편입) / 거절은 setApplicationStatus(id,'cancelled') 사용.
// 소프트 정책상 승인 시 정원 재확인 없음(어드민 최종 판단). status 는 건드리지 않는다.
export async function setApplicationWaitlist(id: string, waitlisted: boolean): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin
      .from('applications')
      .update({ is_waitlisted: waitlisted, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    return { ok: true }
  } catch (e) {
    console.error('[applications] setWaitlist:', e)
    return { ok: false, error: '대기 처리에 실패했습니다.' }
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

// 셀프필 링크 발급(어드민) — 참가자별 개별 링크. 각 링크는 본인 슬롯만 수정 가능(타인 정보 조작 불가).
export type FillLinkResult = { ok: true; fillToken: string } | { ok: false; error: string }
export async function issueFillLink(applicationId: string, participantId: string): Promise<FillLinkResult> {
  try {
    await requireAdmin()
    return { ok: true, fillToken: issueFillToken(applicationId, participantId, Date.now()) }
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
