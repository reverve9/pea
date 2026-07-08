'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { decryptSecret, issueFillToken } from '@/lib/serverCrypto'
import { updateParticipantDetail as applyParticipantDetail, type ParticipantDetailInput } from '@/lib/participantDetail'
import { applyOverrides } from '@/lib/pricing'
import type {
  ApplicationStatus,
  InsuranceRosterEntry,
  RefundStatus,
  ModificationStatus,
  ModificationChange,
  PriceItem,
} from '@/lib/types'

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

// 관리자 직접 환불 등록 — 고객/수정 요청 없이 관리자가 환불을 개시(폐강·비대면요청·중복입금·재량).
// 요청 기반으로 통일: refund_request(origin='admin', status='completed')를 생성해 이력·마이페이지에 잡히게 하고,
// 동시에 refunded_amount 반영(정산 자동). 전액이면 status=refunded, 부분이면 status 유지(refunded_amount만).
// 되돌리기는 '처리된 요청'의 revertRefund 로 통일(모달 위 모달인 직접 환불 경로 폐지).
export async function registerAdminRefund(
  appId: string,
  amount: number,
  markRefunded: boolean,
  account: string,
  reason: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (!Number.isInteger(amount) || amount < 0) return { ok: false, error: '환불 금액이 올바르지 않습니다.' }
    const { data: app, error: gErr } = await supabaseAdmin
      .from('applications').select('phone').eq('id', appId).maybeSingle()
    if (gErr) throw gErr
    if (!app) return { ok: false, error: '신청을 찾을 수 없습니다.' }
    const { error: insErr } = await supabaseAdmin.from('refund_requests').insert({
      application_id: appId,
      phone: app.phone,
      origin: 'admin',
      amount,
      refund_account: account.trim() || null,
      reason: reason.trim() || '관리자 직접 환불',
      status: 'completed',
    })
    if (insErr) throw insErr
    const appPatch: Record<string, unknown> = { refunded_amount: amount, updated_at: new Date().toISOString() }
    if (markRefunded) appPatch.status = 'refunded'
    const { error: upErr } = await supabaseAdmin.from('applications').update(appPatch).eq('id', appId)
    if (upErr) throw upErr
    revalidatePath('/admin/applications')
    revalidatePath('/admin/settlements')
    return { ok: true }
  } catch (e) {
    console.error('[applications] registerAdminRefund:', e)
    return { ok: false, error: '환불 등록에 실패했습니다.' }
  }
}

// 취소 되돌리기 — 취소도 목록에 남고 회귀 가능해야 함(오너). deposit_confirmed_at(취소 시 보존됨) 있으면
// paid, 없으면 pending 으로 복원. deposit_confirmed_at 은 재스탬프하지 않아 정산 기준일 유지.
export async function revertCancel(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { data: app, error: gErr } = await supabaseAdmin
      .from('applications').select('status, deposit_confirmed_at').eq('id', id).maybeSingle()
    if (gErr) throw gErr
    if (!app || app.status !== 'cancelled') return { ok: false, error: '취소 상태가 아닙니다.' }
    const next: ApplicationStatus = app.deposit_confirmed_at ? 'paid' : 'pending'
    const { error } = await supabaseAdmin
      .from('applications').update({ status: next, updated_at: new Date().toISOString() }).eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    revalidatePath('/admin/settlements')
    return { ok: true }
  } catch (e) {
    console.error('[applications] revertCancel:', e)
    return { ok: false, error: '되돌리기에 실패했습니다.' }
  }
}

// 신청 물리 삭제 — 되돌릴 수 없음. participants=FK CASCADE, refund/modification=application_id SET NULL(요청 이력 보존).
// 상태 취소(cancelled)와 다름: 통계·정산에서도 완전 제거. 오클릭 방지 위해 UI에서 확인 경고 필수.
export async function deleteApplication(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin.from('applications').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    revalidatePath('/admin/settlements')
    return { ok: true }
  } catch (e) {
    console.error('[applications] deleteApplication:', e)
    return { ok: false, error: '삭제에 실패했습니다.' }
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

// 추가입금 확인 — 수정 증액으로 생긴 due_amount(부족분)를 입금 확인해 0으로. total_amount는 이미 신규액.
// (단순 입금확인=status pending→paid 와 다른 층위: 이미 paid 인 건의 추가분 정산.)
export async function confirmDuePayment(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    // 확정 시 due_amount 를 0 으로 소비하되, 금액을 due_settled_amount 에 보존(되돌리기용).
    const { data: app, error: gErr } = await supabaseAdmin
      .from('applications').select('due_amount').eq('id', id).maybeSingle()
    if (gErr) throw gErr
    if (!app || (app.due_amount ?? 0) <= 0) return { ok: false, error: '추가입금 대기 상태가 아닙니다.' }
    const { error } = await supabaseAdmin
      .from('applications')
      .update({ due_amount: 0, due_settled_amount: app.due_amount, due_claimed_at: null, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    revalidatePath('/admin/settlements')
    return { ok: true }
  } catch (e) {
    console.error('[applications] confirmDuePayment:', e)
    return { ok: false, error: '추가입금 확인에 실패했습니다.' }
  }
}

// 추가입금 확인 되돌리기 — 오클릭 복구. 보존한 due_settled_amount 를 due_amount 로 복원(정산 재차감).
export async function revertDuePayment(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { data: app, error: gErr } = await supabaseAdmin
      .from('applications').select('due_settled_amount').eq('id', id).maybeSingle()
    if (gErr) throw gErr
    if (!app || app.due_settled_amount == null) return { ok: false, error: '되돌릴 추가입금 확인 내역이 없습니다.' }
    const { error } = await supabaseAdmin
      .from('applications')
      .update({ due_amount: app.due_settled_amount, due_settled_amount: null, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    revalidatePath('/admin/settlements')
    return { ok: true }
  } catch (e) {
    console.error('[applications] revertDuePayment:', e)
    return { ok: false, error: '되돌리기에 실패했습니다.' }
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

// ══════════════════════════════════════════════════════════════
// 요청 처리 — 요청관리 해체로 신청관리에 흡수(환불요청·수정요청)
// ══════════════════════════════════════════════════════════════

const REFUND_STATUSES: RefundStatus[] = ['requested', 'confirmed', 'completed']
const MOD_STATUSES: ModificationStatus[] = ['pending', 'completed', 'rejected']

// ── 환불요청 ──
export async function setRefundRequestStatus(id: string, status: RefundStatus): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (!REFUND_STATUSES.includes(status)) return { ok: false, error: '알 수 없는 상태입니다.' }
    const { error } = await supabaseAdmin
      .from('refund_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    return { ok: true }
  } catch (e) {
    console.error('[applications] setRefundRequestStatus:', e)
    return { ok: false, error: '상태 변경에 실패했습니다.' }
  }
}

export async function saveRefundRequestMemo(id: string, memo: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin
      .from('refund_requests')
      .update({ admin_memo: memo.trim() || null, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    return { ok: true }
  } catch (e) {
    console.error('[applications] saveRefundRequestMemo:', e)
    return { ok: false, error: '메모 저장에 실패했습니다.' }
  }
}

// 환불 확정 — 환불요청 상세에서 금액 입력 → 신청 refunded_amount 설정 + 요청 completed 를 한 번에.
// 환불요청(①)과 금액확정(②)의 단절 해소. 전액취소 아닌 부분환불이면 부분값만 반영(status는 아래 규칙).
// refundAccount = 수정 감액 자동생성 건은 계좌가 비어 있음 → 어드민이 유선으로 받은 계좌를 처리 중 기록.
//   빈 값이면 기존 계좌 유지(user 신청은 이미 채워짐).
export async function confirmRefundFromRequest(
  reqId: string,
  appId: string,
  amount: number,
  markRefunded: boolean,
  refundAccount?: string,
): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (!Number.isInteger(amount) || amount < 0) return { ok: false, error: '환불 금액이 올바르지 않습니다.' }
    // 전액환불이면 status=refunded, 부분환불이면 status 유지(refunded_amount만 반영 → 정산 자동 차감).
    const appPatch: Record<string, unknown> = { refunded_amount: amount, updated_at: new Date().toISOString() }
    if (markRefunded) appPatch.status = 'refunded'
    const { error: aErr } = await supabaseAdmin.from('applications').update(appPatch).eq('id', appId)
    if (aErr) throw aErr
    const reqPatch: Record<string, unknown> = { status: 'completed', updated_at: new Date().toISOString() }
    const acct = refundAccount?.trim()
    if (acct) reqPatch.refund_account = acct
    const { error: rErr } = await supabaseAdmin
      .from('refund_requests')
      .update(reqPatch)
      .eq('id', reqId)
    if (rErr) throw rErr
    revalidatePath('/admin/applications')
    revalidatePath('/admin/settlements')
    return { ok: true }
  } catch (e) {
    console.error('[applications] confirmRefundFromRequest:', e)
    return { ok: false, error: '환불 확정에 실패했습니다.' }
  }
}

// 환불 확정 되돌리기 — 오클릭 복구. refunded_amount=0 + (전액환불이었으면 status paid 복원) + 요청 재오픈.
// ⚠ refunded_amount 는 신청당 단일값(confirm 이 덮어씀) → 한 신청에 환불이 여럿이면 마지막 것만 정확히 복구됨.
export async function revertRefund(reqId: string, appId: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { data: app, error: gErr } = await supabaseAdmin
      .from('applications').select('status').eq('id', appId).maybeSingle()
    if (gErr) throw gErr
    const appPatch: Record<string, unknown> = { refunded_amount: 0, updated_at: new Date().toISOString() }
    if (app?.status === 'refunded') appPatch.status = 'paid' // 전액환불 되돌림 → 입금확인 상태로
    const { error: aErr } = await supabaseAdmin.from('applications').update(appPatch).eq('id', appId)
    if (aErr) throw aErr
    const { error: rErr } = await supabaseAdmin
      .from('refund_requests').update({ status: 'requested', updated_at: new Date().toISOString() }).eq('id', reqId)
    if (rErr) throw rErr
    revalidatePath('/admin/applications')
    revalidatePath('/admin/settlements')
    return { ok: true }
  } catch (e) {
    console.error('[applications] revertRefund:', e)
    return { ok: false, error: '되돌리기에 실패했습니다.' }
  }
}

// ── 수정요청 ──
export async function setModificationStatus(id: string, status: ModificationStatus): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (!MOD_STATUSES.includes(status)) return { ok: false, error: '알 수 없는 상태입니다.' }
    const { error } = await supabaseAdmin
      .from('modification_requests')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    return { ok: true }
  } catch (e) {
    console.error('[applications] setModificationStatus:', e)
    return { ok: false, error: '상태 변경에 실패했습니다.' }
  }
}

export async function saveModificationNotes(id: string, adminReply: string, internalNote: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { error } = await supabaseAdmin
      .from('modification_requests')
      .update({
        admin_reply: adminReply.trim() || null,
        internal_note: internalNote.trim() || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/applications')
    return { ok: true }
  } catch (e) {
    console.error('[applications] saveModificationNotes:', e)
    return { ok: false, error: '저장에 실패했습니다.' }
  }
}

// 변경 diff 로 고객 답변 문구 자동 생성.
function autoReplyFromChanges(changes: ModificationChange[]): string {
  if (!changes.length) return '요청하신 내용을 반영했습니다.'
  const lines = changes.map((c) => `· ${c.participant_name} ${c.label}: ${c.current || '(없음)'} → ${c.requested || '(없음)'}`)
  return `요청하신 아래 내용을 반영했습니다.\n${lines.join('\n')}`
}

const RENTAL_FIELD_KEY: Record<string, string> = {
  rental_apparel: 'apparel',
  rental_protector: 'protector',
  rental_goggle: 'goggle',
  rental_glove: 'glove',
}

// 수정요청 반영(정형 changes 직접 적용) — 참가자 필드 갱신 + 요금 델타 라우팅 + 요청 완료.
//  · 인적정보(성함·연락처·생년월일·성별·강습·용품) = 가격 무관, 그대로 반영.
//  · 렌탈 유료옵션 토글 = 직무만 요금 영향(자율 렌탈은 배정이라 가격 불변, [[rental-model]]).
//  · 델타<0 → 부분환불 환불요청 자동생성(origin=modification). 델타>0 → due_amount(입금대기 추가).
//    입금확정(paid/completed) 건에만 라우팅, 미입금은 total_amount만 갱신.
export async function applyModification(id: string, adminReply: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { data: req, error: rErr } = await supabaseAdmin
      .from('modification_requests')
      .select('id, application_id, changes')
      .eq('id', id)
      .maybeSingle()
    if (rErr) throw rErr
    if (!req || !req.application_id) return { ok: false, error: '연결된 신청을 찾을 수 없습니다.' }
    const changes = (Array.isArray(req.changes) ? req.changes : []) as ModificationChange[]

    const { data: app, error: aErr } = await supabaseAdmin
      .from('applications')
      .select('id, session_id, total_amount, due_amount, status, phone, session:sessions(schedule_type), participants(id, rentals)')
      .eq('id', req.application_id)
      .maybeSingle()
    if (aErr) throw aErr
    if (!app) return { ok: false, error: '신청을 찾을 수 없습니다.' }
    const sess = Array.isArray(app.session) ? app.session[0] : app.session
    const isJikmu = (sess?.schedule_type ?? 'jikmu') === 'jikmu'
    const partRows = (app.participants ?? []) as { id: string; rentals: Record<string, unknown> }[]

    // 1) 참가자별 필드 반영
    const byPart = new Map<string, ModificationChange[]>()
    for (const c of changes) {
      if (c.target !== 'participant' || !c.participant_id) continue
      const arr = byPart.get(c.participant_id) ?? []
      arr.push(c)
      byPart.set(c.participant_id, arr)
    }
    for (const [pid, cs] of byPart) {
      const cur = partRows.find((p) => p.id === pid)
      const rentals: Record<string, unknown> = { ...(cur?.rentals ?? {}) }
      const patch: Record<string, unknown> = {}
      let rentalsTouched = false
      for (const c of cs) {
        switch (c.field) {
          case 'name': patch.name = c.requested; break
          case 'phone': patch.phone = c.requested || null; break
          case 'birth_front': patch.birth_front = c.requested || null; break
          case 'gender': patch.gender = c.requested || null; break
          case 'lesson_level': patch.lesson_level = c.requested || null; break
          case 'equipment': rentals.equipment = c.requested || null; rentalsTouched = true; break
          case 'rental_apparel': rentals.apparel = c.requested === 'true'; rentalsTouched = true; break
          case 'rental_protector': rentals.protector = c.requested === 'true'; rentalsTouched = true; break
          case 'rental_goggle': rentals.goggle = c.requested === 'true'; rentalsTouched = true; break
          case 'rental_glove': rentals.glove = c.requested === 'true'; rentalsTouched = true; break
        }
      }
      if (rentalsTouched) patch.rentals = rentals
      if (Object.keys(patch).length) {
        const { error } = await supabaseAdmin.from('participants').update(patch).eq('id', pid)
        if (error) throw error
      }
    }

    // 2) 요금 델타(직무 렌탈 토글만)
    let delta = 0
    if (isJikmu) {
      const rentalChanges = changes.filter((c) => c.field in RENTAL_FIELD_KEY)
      if (rentalChanges.length) {
        const { data: priceRows } = await supabaseAdmin
          .from('price_items')
          .select('id, category, item_key, label, amount, sort_order')
          .eq('is_active', true)
        const { data: ovRows } = await supabaseAdmin
          .from('session_price_overrides')
          .select('item_key, amount')
          .eq('session_id', app.session_id)
        const items = applyOverrides((priceRows as PriceItem[]) ?? [], (ovRows as { item_key: string; amount: number }[]) ?? [])
        const by: Record<string, number> = {}
        for (const it of items) by[it.item_key] = it.amount
        for (const c of rentalChanges) {
          const amt = by[RENTAL_FIELD_KEY[c.field]] ?? 0
          if (c.requested === 'true' && c.current !== 'true') delta += amt
          else if (c.requested !== 'true' && c.current === 'true') delta -= amt
        }
      }
    }

    // 3) 델타 라우팅
    const paidLike = app.status === 'paid' || app.status === 'completed'
    const appPatch: Record<string, unknown> = {
      total_amount: (app.total_amount ?? 0) + delta,
      updated_at: new Date().toISOString(),
    }
    let routeNote = ''
    if (delta !== 0 && paidLike) {
      if (delta < 0) {
        const refund = -delta
        const { error } = await supabaseAdmin.from('refund_requests').insert({
          application_id: app.id,
          phone: app.phone,
          origin: 'modification',
          amount: refund,
          modification_request_id: id,
          reason: '수정 반영에 따른 부분환불',
          status: 'requested',
        })
        if (error) throw error
        routeNote = `부분환불 ${refund.toLocaleString()}원이 환불요청으로 접수되었습니다. 담당자 확인 후 환불됩니다.`
      } else {
        appPatch.due_amount = (app.due_amount ?? 0) + delta
        appPatch.due_claimed_at = null      // 새 부족분 발생 → 신규 신고 필요(이전 신고 무효화)
        appPatch.due_settled_amount = null  // 이전 확정 마커 초기화(되돌리기 대상 아님)
        routeNote = `옵션 추가로 ${delta.toLocaleString()}원 추가 입금이 필요합니다. 마이페이지 안내를 확인해 주세요.`
      }
    }
    const { error: upErr } = await supabaseAdmin.from('applications').update(appPatch).eq('id', app.id)
    if (upErr) throw upErr

    // 4) 요청 완료 + 답변
    const reply = (adminReply.trim() || autoReplyFromChanges(changes)) + (routeNote ? `\n\n${routeNote}` : '')
    const { error: cErr } = await supabaseAdmin
      .from('modification_requests')
      .update({ status: 'completed', admin_reply: reply, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (cErr) throw cErr

    revalidatePath('/admin/applications')
    revalidatePath('/admin/settlements')
    return { ok: true }
  } catch (e) {
    console.error('[applications] applyModification:', e)
    return { ok: false, error: '수정 반영에 실패했습니다.' }
  }
}

// 수정 반영 되돌리기 — 오클릭 복구. applyModification 의 역연산 + 요청 재오픈(pending).
//  · 참가자 필드: changes.current(변경 전 스냅샷)로 역복원.
//  · 요금: total_amount −= delta. 증액분은 미확정 due 에서 차감, 감액 자동환불요청은 회수(미완료분).
//  · 안전장치: 연동 환불이 이미 '완료'면 되돌리기 차단(실제 환불금 지급됨 → 먼저 환불 되돌려야).
export async function revertModification(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    const { data: req, error: rErr } = await supabaseAdmin
      .from('modification_requests')
      .select('id, application_id, changes, status')
      .eq('id', id)
      .maybeSingle()
    if (rErr) throw rErr
    if (!req || req.status !== 'completed') return { ok: false, error: '반영 완료된 수정요청만 되돌릴 수 있습니다.' }
    if (!req.application_id) return { ok: false, error: '연결된 신청을 찾을 수 없습니다.' }
    const changes = (Array.isArray(req.changes) ? req.changes : []) as ModificationChange[]

    const { data: app, error: aErr } = await supabaseAdmin
      .from('applications')
      .select('id, session_id, total_amount, due_amount, status, session:sessions(schedule_type), participants(id, rentals)')
      .eq('id', req.application_id)
      .maybeSingle()
    if (aErr) throw aErr
    if (!app) return { ok: false, error: '신청을 찾을 수 없습니다.' }
    const sess = Array.isArray(app.session) ? app.session[0] : app.session
    const isJikmu = (sess?.schedule_type ?? 'jikmu') === 'jikmu'
    const partRows = (app.participants ?? []) as { id: string; rentals: Record<string, unknown> }[]

    // 요금 델타 재계산(applyModification 과 동일) — 역복원·안전장치 판단에 사용
    let delta = 0
    if (isJikmu) {
      const rentalChanges = changes.filter((c) => c.field in RENTAL_FIELD_KEY)
      if (rentalChanges.length) {
        const { data: priceRows } = await supabaseAdmin
          .from('price_items')
          .select('id, category, item_key, label, amount, sort_order')
          .eq('is_active', true)
        const { data: ovRows } = await supabaseAdmin
          .from('session_price_overrides')
          .select('item_key, amount')
          .eq('session_id', app.session_id)
        const items = applyOverrides((priceRows as PriceItem[]) ?? [], (ovRows as { item_key: string; amount: number }[]) ?? [])
        const by: Record<string, number> = {}
        for (const it of items) by[it.item_key] = it.amount
        for (const c of rentalChanges) {
          const amt = by[RENTAL_FIELD_KEY[c.field]] ?? 0
          if (c.requested === 'true' && c.current !== 'true') delta += amt
          else if (c.requested !== 'true' && c.current === 'true') delta -= amt
        }
      }
    }

    // 안전장치: 감액 연동 환불이 이미 완료됐으면 차단(먼저 환불 되돌려야 함)
    if (delta < 0) {
      const { data: doneRefunds, error: dErr } = await supabaseAdmin
        .from('refund_requests').select('id').eq('modification_request_id', id).eq('status', 'completed')
      if (dErr) throw dErr
      if (doneRefunds && doneRefunds.length > 0) {
        return { ok: false, error: '연동된 환불이 이미 완료되었습니다. 먼저 환불을 되돌린 뒤 다시 시도해 주세요.' }
      }
    }

    // 1) 참가자 필드 역복원(requested → current)
    const byPart = new Map<string, ModificationChange[]>()
    for (const c of changes) {
      if (c.target !== 'participant' || !c.participant_id) continue
      const arr = byPart.get(c.participant_id) ?? []
      arr.push(c)
      byPart.set(c.participant_id, arr)
    }
    for (const [pid, cs] of byPart) {
      const cur = partRows.find((p) => p.id === pid)
      const rentals: Record<string, unknown> = { ...(cur?.rentals ?? {}) }
      const patch: Record<string, unknown> = {}
      let rentalsTouched = false
      for (const c of cs) {
        switch (c.field) {
          case 'name': patch.name = c.current; break
          case 'phone': patch.phone = c.current || null; break
          case 'birth_front': patch.birth_front = c.current || null; break
          case 'gender': patch.gender = c.current || null; break
          case 'lesson_level': patch.lesson_level = c.current || null; break
          case 'equipment': rentals.equipment = c.current || null; rentalsTouched = true; break
          case 'rental_apparel': rentals.apparel = c.current === 'true'; rentalsTouched = true; break
          case 'rental_protector': rentals.protector = c.current === 'true'; rentalsTouched = true; break
          case 'rental_goggle': rentals.goggle = c.current === 'true'; rentalsTouched = true; break
          case 'rental_glove': rentals.glove = c.current === 'true'; rentalsTouched = true; break
        }
      }
      if (rentalsTouched) patch.rentals = rentals
      if (Object.keys(patch).length) {
        const { error } = await supabaseAdmin.from('participants').update(patch).eq('id', pid)
        if (error) throw error
      }
    }

    // 2) 금액 역복원
    const appPatch: Record<string, unknown> = {
      total_amount: (app.total_amount ?? 0) - delta,
      updated_at: new Date().toISOString(),
    }
    if (delta > 0) {
      const nextDue = Math.max(0, (app.due_amount ?? 0) - delta)
      appPatch.due_amount = nextDue
      if (nextDue === 0) appPatch.due_claimed_at = null
    }
    const { error: upErr } = await supabaseAdmin.from('applications').update(appPatch).eq('id', app.id)
    if (upErr) throw upErr

    // 3) 감액 자동생성 환불요청 회수(미완료분만)
    if (delta < 0) {
      const { error: delErr } = await supabaseAdmin
        .from('refund_requests').delete().eq('modification_request_id', id).neq('status', 'completed')
      if (delErr) throw delErr
    }

    // 4) 요청 재오픈(pending) + 답변 회수
    const { error: cErr } = await supabaseAdmin
      .from('modification_requests')
      .update({ status: 'pending', admin_reply: null, updated_at: new Date().toISOString() })
      .eq('id', id)
    if (cErr) throw cErr

    revalidatePath('/admin/applications')
    revalidatePath('/admin/settlements')
    return { ok: true }
  } catch (e) {
    console.error('[applications] revertModification:', e)
    return { ok: false, error: '되돌리기에 실패했습니다.' }
  }
}
