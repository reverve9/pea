'use server'

import { revalidatePath } from 'next/cache'
import { requireAdmin } from '@/lib/adminGuard'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import type { ScheduleType } from '@/lib/types'

// 연수 차수 CRUD 서버 액션 — requireAdmin(쿠키 재검증) 후 service_role 로 RLS 우회. [[admin-mutation-architecture]]
export interface SessionInput {
  course_id: string
  label: string
  schedule_type: ScheduleType
  starts_on: string // YYYY-MM-DD
  ends_on: string // YYYY-MM-DD
  nights: number // 날짜 차이로 파생(클라 계산)
  capacity: number
  is_active: boolean
}

export type ActionResult = { ok: true } | { ok: false; error: string }
// 생성은 새 차수 id 를 돌려준다 — 개설 직후 요금 오버라이드를 이어 저장하기 위함.
export type CreateResult = { ok: true; id: string } | { ok: false; error: string }

const TYPES: ScheduleType[] = ['weekday_2n', 'weekend_2n', 'weekend_1n', 'jikmu']

function validate(input: SessionInput): string | null {
  if (!input.course_id) return '프로그램(과정)을 선택해 주세요.'
  if (!input.label.trim()) return '회차명을 입력해 주세요.'
  if (!TYPES.includes(input.schedule_type)) return '유형이 올바르지 않습니다.'
  if (!input.starts_on || !input.ends_on) return '일정(시작·종료일)을 입력해 주세요.'
  if (input.ends_on < input.starts_on) return '종료일이 시작일보다 빠릅니다.'
  if (!Number.isInteger(input.capacity) || input.capacity < 1) return '정원을 1명 이상으로 입력해 주세요.'
  return null
}

function clean(input: SessionInput) {
  return {
    course_id: input.course_id,
    label: input.label.trim(),
    schedule_type: input.schedule_type,
    starts_on: input.starts_on,
    ends_on: input.ends_on,
    nights: Math.max(0, Math.trunc(input.nights)),
    capacity: input.capacity,
    is_active: input.is_active,
  }
}

export async function createSession(input: SessionInput): Promise<CreateResult> {
  try {
    await requireAdmin()
    const err = validate(input)
    if (err) return { ok: false, error: err }
    const { data, error } = await supabaseAdmin.from('sessions').insert(clean(input)).select('id').single()
    if (error) throw error
    revalidatePath('/admin/sessions')
    return { ok: true, id: (data as { id: string }).id }
  } catch (e) {
    console.error('[sessions] create:', e)
    return { ok: false, error: '회차 저장에 실패했습니다.' }
  }
}

export async function updateSession(id: string, input: SessionInput): Promise<ActionResult> {
  try {
    await requireAdmin()
    const err = validate(input)
    if (err) return { ok: false, error: err }
    const { error } = await supabaseAdmin
      .from('sessions')
      .update({ ...clean(input), updated_at: new Date().toISOString() })
      .eq('id', id)
    if (error) throw error
    revalidatePath('/admin/sessions')
    return { ok: true }
  } catch (e) {
    console.error('[sessions] update:', e)
    return { ok: false, error: '회차 수정에 실패했습니다.' }
  }
}

// 기본 요금(price_items) 배치 저장 — 변경된 행만(금액). 요금 모달 하단·기본요금 모달 공용.
//   노출 여부는 일정 관리 소관이라 미변경. 폼은 anon fetch라 즉시 반영, 어드민 revalidate.
export interface PriceAmountPatch {
  id: string
  amount: number
}

export async function savePriceItems(patches: PriceAmountPatch[]): Promise<ActionResult> {
  try {
    await requireAdmin()
    const clean = patches.filter((p) => p.id && Number.isInteger(p.amount) && p.amount >= 0)
    if (clean.length !== patches.length) return { ok: false, error: '금액을 0원 이상 정수로 입력해 주세요.' }
    if (clean.length === 0) return { ok: true }
    const updatedAt = new Date().toISOString()
    for (const p of clean) {
      const { error } = await supabaseAdmin
        .from('price_items')
        .update({ amount: p.amount, updated_at: updatedAt })
        .eq('id', p.id)
      if (error) throw error
    }
    revalidatePath('/admin/sessions')
    return { ok: true }
  } catch (e) {
    console.error('[sessions] savePriceItems:', e)
    return { ok: false, error: '기본 요금 저장에 실패했습니다.' }
  }
}

// 차수 요금 오버라이드 동기화 — 넘어온 항목으로 '통째 교체'(delete-all → insert non-empty).
//   기본가와 같거나 비운 항목은 클라에서 제외해 넘긴다(sparse — 다른 것만 저장). [[soft-capacity-waitlist]] 폼과 동일 머지.
export async function syncSessionOverrides(
  sessionId: string,
  overrides: { item_key: string; amount: number }[],
): Promise<ActionResult> {
  try {
    await requireAdmin()
    if (!sessionId) return { ok: false, error: '차수를 찾을 수 없습니다.' }
    const clean = overrides
      .filter((o) => o.item_key && Number.isInteger(o.amount) && o.amount >= 0)
      .map((o) => ({ session_id: sessionId, item_key: o.item_key, amount: o.amount }))
    const { error: dErr } = await supabaseAdmin
      .from('session_price_overrides')
      .delete()
      .eq('session_id', sessionId)
    if (dErr) throw dErr
    if (clean.length > 0) {
      const { error: iErr } = await supabaseAdmin.from('session_price_overrides').insert(clean)
      if (iErr) throw iErr
    }
    revalidatePath('/admin/sessions')
    return { ok: true }
  } catch (e) {
    console.error('[sessions] syncOverrides:', e)
    return { ok: false, error: '요금 조정 저장에 실패했습니다.' }
  }
}

export async function deleteSession(id: string): Promise<ActionResult> {
  try {
    await requireAdmin()
    // 신청이 연결된 회차는 FK(applications.session_id ON DELETE RESTRICT)로 삭제 불가 — 먼저 확인해 친절히 막는다.
    const { count, error: cErr } = await supabaseAdmin
      .from('applications')
      .select('id', { count: 'exact', head: true })
      .eq('session_id', id)
    if (cErr) throw cErr
    if ((count ?? 0) > 0) {
      return { ok: false, error: `신청 ${count}건이 연결된 회차는 삭제할 수 없습니다. 대신 '비활성' 처리하세요.` }
    }
    const { error } = await supabaseAdmin.from('sessions').delete().eq('id', id)
    if (error) throw error
    revalidatePath('/admin/sessions')
    return { ok: true }
  } catch (e) {
    console.error('[sessions] delete:', e)
    return { ok: false, error: '삭제에 실패했습니다.' }
  }
}
