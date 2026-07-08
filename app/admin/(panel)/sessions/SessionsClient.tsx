'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, PenLine, Tags, Save } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import AdminModal from '@/components/admin/AdminModal'
import { SCHEDULE_TYPE, formatPeriod, formatKRW } from '@/lib/display'
import type { SessionAdmin, CourseOption, ScheduleType, PriceItemAdmin, PriceCategory, SessionPriceOverride } from '@/lib/types'
import { createSession, updateSession, deleteSession, syncSessionOverrides, savePriceItems, type SessionInput } from './actions'
import BaseGrid, { initBaseAmounts, basePatches, baseHasInvalid, baseDirtyCount } from './BaseGrid'

const TYPE_ORDER: ScheduleType[] = ['jikmu', 'weekday_2n', 'weekend_2n', 'weekend_1n']

// 차수 요금 조정(오버라이드) 섹션의 카테고리 표시 순서·라벨.
const PRICE_CATEGORIES: { key: PriceCategory; label: string }[] = [
  { key: 'jikmu_base', label: '직무 기본가' },
  { key: 'room_surcharge', label: '개별객실 추가금' },
  { key: 'pkg_price', label: '자율 패키지가' },
  { key: 'rental', label: '렌탈·옵션' },
]

// 날짜 차이 → 박수(nights). 둘 다 있을 때만.
function calcNights(starts: string, ends: string): number {
  if (!starts || !ends) return 0
  const d = Math.round((Date.parse(ends) - Date.parse(starts)) / 86400000)
  return Number.isFinite(d) && d > 0 ? d : 0
}

// 편집 대상: 'new'(신규) | SessionAdmin(수정) | null(닫힘)
type Editing = SessionAdmin | 'new' | null

export default function SessionsClient({
  sessions,
  courses,
  priceItems,
  overrides,
}: {
  sessions: SessionAdmin[]
  courses: CourseOption[]
  priceItems: PriceItemAdmin[]
  overrides: SessionPriceOverride[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<Editing>(null)
  const [pricingFor, setPricingFor] = useState<SessionAdmin | null>(null)
  const [baseOpen, setBaseOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  // 차수별 오버라이드 개수 — 목록에 '요금조정 N' 마커 표시용.
  const overrideCount = React.useMemo(() => {
    const m: Record<string, number> = {}
    for (const o of overrides) m[o.session_id] = (m[o.session_id] ?? 0) + 1
    return m
  }, [overrides])

  return (
    <>
      <div className="mb-4 flex justify-end gap-2">
        <button
          type="button"
          onClick={() => setBaseOpen(true)}
          className="flex items-center gap-1.5 rounded-[9px] border border-[#e2e5e9] bg-white px-4 py-2.5 text-[13px] font-[500] text-[#4b5563] transition-colors hover:bg-[#f7f8f9]"
        >
          <Tags size={15} />기본 요금
        </button>
        <button
          type="button"
          onClick={() => setEditing('new')}
          className="flex items-center gap-1.5 rounded-[9px] bg-[#1e3a5f] px-4 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90"
        >
          <Plus size={15} />새 회차 개설
        </button>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#eceef1] bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#eceef1] text-[12px] font-[500] text-[#9ca3af]">
              <th className="px-5 py-3">회차</th>
              <th className="px-2 py-3">유형</th>
              <th className="px-2 py-3 whitespace-nowrap">일정</th>
              <th className="px-2 py-3 whitespace-nowrap">정원</th>
              <th className="px-2 py-3">활성</th>
              <th className="px-5 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center text-[13px] font-[300] text-[#9ca3af]">
                  개설된 회차가 없습니다. 우측 상단에서 새 회차를 개설하세요.
                </td>
              </tr>
            ) : (
              sessions.map((s) => {
                const type = SCHEDULE_TYPE[s.schedule_type]
                return (
                  <tr
                    key={s.id}
                    className={`border-b border-[#f1f3f5] last:border-0 hover:bg-[#f9fafb] ${
                      s.is_active ? '' : 'bg-[#fafbfc] text-[#9ca3af]'
                    }`}
                  >
                    <td className="px-5 py-3.5">
                      <div className="text-[13.5px] font-[500] text-[#1f2937]">{s.label}</div>
                      <div className="text-[11.5px] font-[300] text-[#9ca3af]">{s.course_name}</div>
                      {overrideCount[s.id] > 0 && (
                        <span className="mt-1 inline-flex items-center gap-1 rounded-[4px] bg-[#eef2f7] px-1.5 py-0.5 text-[10.5px] font-[500] leading-none text-[#3f6a99]">
                          <Tags size={10} />요금조정 {overrideCount[s.id]}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-3.5">
                      <Badge color={type.color} size="sm">{type.label}</Badge>
                    </td>
                    <td className="px-2 py-3.5 whitespace-nowrap text-[12.5px] font-[300] tabular-nums text-[#4b5563]">
                      {formatPeriod(s.starts_on, s.ends_on, s.nights)}
                    </td>
                    <td className="px-2 py-3.5 whitespace-nowrap text-[13px] font-[500] tabular-nums text-[#1f2937]">
                      {s.capacity}
                      <span className="text-[11.5px] font-[300] text-[#9ca3af]">명</span>
                    </td>
                    <td className="px-2 py-3.5">
                      <Badge color={s.is_active ? 'emerald' : 'slate'} size="sm">
                        {s.is_active ? '활성' : '비활성'}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(s)}
                        className="text-[13px] font-[400] text-[#3f6a99] hover:underline"
                      >
                        수정
                      </button>
                      <span className="px-1.5 text-[#e5e7eb]">|</span>
                      <button
                        type="button"
                        onClick={() => setPricingFor(s)}
                        className="text-[13px] font-[400] text-[#3f6a99] hover:underline"
                      >
                        요금
                      </button>
                      <span className="px-1.5 text-[#e5e7eb]">|</span>
                      <DeleteButton id={s.id} onDone={() => router.refresh()} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <SessionEditor
          editing={editing}
          courses={courses}
          pending={pending}
          onClose={() => setEditing(null)}
          onSubmit={(input) => {
            startTransition(async () => {
              const res = editing === 'new' ? await createSession(input) : await updateSession(editing.id, input)
              if (res.ok) {
                setEditing(null)
                router.refresh()
              } else {
                alert(res.error)
              }
            })
          }}
        />
      )}

      {pricingFor && (
        <SessionPriceModal
          session={pricingFor}
          items={priceItems}
          overrides={overrides.filter((o) => o.session_id === pricingFor.id)}
          onClose={() => setPricingFor(null)}
          onSaved={() => {
            setPricingFor(null)
            router.refresh()
          }}
        />
      )}

      {baseOpen && (
        <BaseModal
          items={priceItems}
          onClose={() => setBaseOpen(false)}
          onSaved={() => {
            setBaseOpen(false)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

// 차수 요금 = 상단 '이 차수 조정'(오버라이드) + 하단 '기본 요금'(모든 차수 공통, 편집). 한 번에 저장.
function SessionPriceModal({
  session,
  items,
  overrides,
  onClose,
  onSaved,
}: {
  session: SessionAdmin
  items: PriceItemAdmin[]
  overrides: SessionPriceOverride[]
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  // 오버라이드 입력값(문자열, item_key 키) — 기존은 프리필, 없으면 빈칸(=기본가).
  const [vals, setVals] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const o of overrides) m[o.item_key] = String(o.amount)
    return m
  })
  // 하단 기본 요금 편집값(id 키).
  const [baseAmounts, setBaseAmounts] = useState<Record<string, string>>(() => initBaseAmounts(items))

  const baseInvalid = baseHasInvalid(items, baseAmounts)
  const baseChanges = baseDirtyCount(items, baseAmounts)

  const save = () => {
    if (baseInvalid) return
    // 차수 오버라이드: 비었거나 기본가와 같으면 제외(sparse).
    const ov: { item_key: string; amount: number }[] = []
    for (const it of items) {
      const raw = vals[it.item_key]
      if (raw == null || raw.trim() === '') continue
      const n = Math.trunc(Number(raw))
      if (!Number.isFinite(n) || n < 0) continue
      if (n === it.amount) continue
      ov.push({ item_key: it.item_key, amount: n })
    }
    const bPatches = basePatches(items, baseAmounts)
    startTransition(async () => {
      if (bPatches.length > 0) {
        const r1 = await savePriceItems(bPatches)
        if (!r1.ok) return alert(r1.error)
      }
      const r2 = await syncSessionOverrides(session.id, ov)
      if (r2.ok) onSaved()
      else alert(r2.error)
    })
  }

  return (
    <AdminModal title={`요금 · ${session.label}`} onClose={onClose}>
      <div className="max-h-[62vh] space-y-6 overflow-y-auto pr-1">
        {/* 상단: 이 차수 조정 */}
        <div>
          <div className="mb-1 text-[13px] font-[600] text-[#1f2937]">이 차수 조정</div>
          <p className="mb-3 text-[12px] font-[300] leading-relaxed text-[#6b7280]">
            이 차수에서만 다른 금액을 쓸 항목에 입력하세요. 비우면 아래 기본 요금을 그대로 씁니다. 기존 신청은 제출 당시 금액으로 확정되어 영향받지 않습니다.
          </p>
          <div className="space-y-4">
            {PRICE_CATEGORIES.map((cat) => {
              const rows = items.filter((it) => it.category === cat.key)
              if (rows.length === 0) return null
              return (
                <div key={cat.key}>
                  <div className="mb-1.5 text-[11.5px] font-[600] text-[#9ca3af]">{cat.label}</div>
                  <div className="space-y-1">
                    {rows.map((it) => (
                      <div key={it.item_key} className="flex items-center gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[12.5px] font-[400] text-[#374151]">{it.label}</div>
                          <div className="text-[11px] font-[300] tabular-nums text-[#9ca3af]">기본 {formatKRW(it.amount)}</div>
                        </div>
                        <input
                          type="number"
                          min={0}
                          step={500}
                          inputMode="numeric"
                          value={vals[it.item_key] ?? ''}
                          onChange={(e) => setVals((v) => ({ ...v, [it.item_key]: e.target.value }))}
                          placeholder={String(it.amount)}
                          className="w-28 rounded-[7px] border border-[#e2e5e9] bg-white px-2.5 py-1.5 text-right text-[12.5px] tabular-nums text-[#1f2937] outline-none placeholder:text-[#cfd4da] focus:border-[#1e3a5f]"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* 하단: 기본 요금(공통) */}
        <div className="border-t border-[#eceef1] pt-4">
          <div className="mb-1 flex items-center gap-2">
            <span className="text-[13px] font-[600] text-[#1f2937]">기본 요금</span>
            <span className="rounded-[4px] bg-[#fdf1e6] px-1.5 py-0.5 text-[10.5px] font-[500] text-[#c2751a]">
              모든 차수 공통 · 바꾸면 전체 적용
            </span>
          </div>
          <p className="mb-3 text-[12px] font-[300] text-[#6b7280]">여기 값을 바꾸면 조정하지 않은 모든 차수에 반영됩니다.</p>
          <BaseGrid items={items} amounts={baseAmounts} onAmount={(id, v) => setBaseAmounts((a) => ({ ...a, [id]: v }))} />
        </div>
      </div>

      <div className="mt-6 flex items-center justify-end gap-3">
        {baseChanges > 0 && !baseInvalid && (
          <span className="text-[12px] font-[400] text-[#c2751a]">기본 요금 {baseChanges}건 변경</span>
        )}
        {baseInvalid && <span className="text-[12px] font-[400] text-[#c0392b]">기본 요금 입력값 확인</span>}
        <button
          type="button"
          onClick={onClose}
          className="rounded-[9px] border border-[#e2e5e9] bg-white px-4 py-2.5 text-[13px] font-[500] text-[#4b5563] transition-colors hover:bg-[#f7f8f9]"
        >
          취소
        </button>
        <button
          type="button"
          disabled={pending || baseInvalid}
          onClick={save}
          className="flex items-center gap-1.5 rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PenLine size={14} />
          {pending ? '저장 중…' : '저장'}
        </button>
      </div>
    </AdminModal>
  )
}

// 기본 요금 단독 편집 — 헤더 버튼(차수 없이/직접 편집 대비).
function BaseModal({
  items,
  onClose,
  onSaved,
}: {
  items: PriceItemAdmin[]
  onClose: () => void
  onSaved: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [amounts, setAmounts] = useState<Record<string, string>>(() => initBaseAmounts(items))
  const invalid = baseHasInvalid(items, amounts)
  const changes = baseDirtyCount(items, amounts)

  const save = () => {
    if (invalid || changes === 0) return
    startTransition(async () => {
      const res = await savePriceItems(basePatches(items, amounts))
      if (res.ok) onSaved()
      else alert(res.error)
    })
  }

  return (
    <AdminModal title="기본 요금" onClose={onClose}>
      <p className="mb-4 text-[12.5px] font-[300] leading-relaxed text-[#6b7280]">
        모든 차수가 공통으로 쓰는 기본 요금입니다. 특정 차수만 다르게 하려면 그 차수의 <span className="font-[500] text-[#374151]">요금</span>에서 조정하세요.
      </p>
      <div className="max-h-[62vh] overflow-y-auto pr-1">
        <BaseGrid items={items} amounts={amounts} onAmount={(id, v) => setAmounts((a) => ({ ...a, [id]: v }))} />
      </div>
      <div className="mt-6 flex items-center justify-end gap-3">
        {changes > 0 && !invalid && (
          <span className="text-[12px] font-[400] text-[#6b7280]">
            변경 <span className="font-[600] tabular-nums text-[#1f2937]">{changes}</span>건
          </span>
        )}
        {invalid && <span className="text-[12px] font-[400] text-[#c0392b]">입력값을 확인해 주세요</span>}
        <button
          type="button"
          onClick={onClose}
          className="rounded-[9px] border border-[#e2e5e9] bg-white px-4 py-2.5 text-[13px] font-[500] text-[#4b5563] transition-colors hover:bg-[#f7f8f9]"
        >
          취소
        </button>
        <button
          type="button"
          disabled={pending || invalid || changes === 0}
          onClick={save}
          className="flex items-center gap-1.5 rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={14} />
          {pending ? '저장 중…' : '변경사항 저장'}
        </button>
      </div>
    </AdminModal>
  )
}

function DeleteButton({ id, onDone }: { id: string; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => {
        if (!confirm('이 회차를 삭제할까요? 되돌릴 수 없습니다. (신청이 있으면 삭제 대신 비활성 처리됩니다.)')) return
        startTransition(async () => {
          const res = await deleteSession(id)
          if (res.ok) onDone()
          else alert(res.error)
        })
      }}
      className="text-[13px] font-[400] text-[#c0392b] hover:underline disabled:opacity-40"
    >
      삭제
    </button>
  )
}

function SessionEditor({
  editing,
  courses,
  pending,
  onClose,
  onSubmit,
}: {
  editing: SessionAdmin | 'new'
  courses: CourseOption[]
  pending: boolean
  onClose: () => void
  onSubmit: (input: SessionInput) => void
}) {
  const occupied = editing !== 'new' ? editing.occupied : null
  const initial: SessionInput =
    editing === 'new'
      ? {
          course_id: courses[0]?.id ?? '',
          label: '',
          schedule_type: 'jikmu',
          starts_on: '',
          ends_on: '',
          nights: 0,
          capacity: 50,
          is_active: true,
        }
      : {
          course_id: editing.course_id,
          label: editing.label,
          schedule_type: editing.schedule_type,
          starts_on: editing.starts_on,
          ends_on: editing.ends_on,
          nights: editing.nights,
          capacity: editing.capacity,
          is_active: editing.is_active,
        }
  const [form, setForm] = useState<SessionInput>(initial)
  const nights = calcNights(form.starts_on, form.ends_on)
  const belowOccupied = occupied != null && form.capacity < occupied
  const canSubmit =
    !!form.course_id &&
    !!form.label.trim() &&
    !!form.starts_on &&
    !!form.ends_on &&
    form.ends_on >= form.starts_on &&
    form.capacity >= 1 &&
    !pending

  return (
    <AdminModal title={editing === 'new' ? '새 회차 개설' : '회차 수정'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="프로그램(과정)">
          <select
            value={form.course_id}
            onChange={(e) => setForm((f) => ({ ...f, course_id: e.target.value }))}
            className={selectClass}
          >
            {courses.length === 0 && <option value="">등록된 과정이 없습니다</option>}
            {courses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
                {c.sport ? ` · ${c.sport}` : ''} ({c.course_type === 'jikmu' ? '직무' : '자율'})
              </option>
            ))}
          </select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="회차명">
            <input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder="예: 직무 1차수"
              className={inputClass}
            />
          </Field>
          <Field label="유형">
            <select
              value={form.schedule_type}
              onChange={(e) => setForm((f) => ({ ...f, schedule_type: e.target.value as ScheduleType }))}
              className={selectClass}
            >
              {TYPE_ORDER.map((t) => (
                <option key={t} value={t}>{SCHEDULE_TYPE[t].label}</option>
              ))}
            </select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="시작일">
            <input
              type="date"
              value={form.starts_on}
              onChange={(e) => setForm((f) => ({ ...f, starts_on: e.target.value }))}
              className={inputClass}
            />
          </Field>
          <Field label="종료일">
            <input
              type="date"
              value={form.ends_on}
              min={form.starts_on || undefined}
              onChange={(e) => setForm((f) => ({ ...f, ends_on: e.target.value }))}
              className={inputClass}
            />
          </Field>
        </div>
        <p className="-mt-1 text-[12px] font-[300] text-[#6b7280]">
          기간 <span className="font-[500] text-[#1f2937]">{nights}박 {nights + 1}일</span>
          <span className="text-[#9ca3af]"> (날짜로 자동 계산)</span>
        </p>

        <div className="grid grid-cols-2 items-end gap-3">
          <Field label="정원(명)">
            <input
              type="number"
              min={1}
              value={form.capacity}
              onChange={(e) => setForm((f) => ({ ...f, capacity: Math.max(0, Math.trunc(Number(e.target.value) || 0)) }))}
              className={inputClass}
            />
          </Field>
          <div className="pb-2.5">
            <Check
              label="활성(모집 노출)"
              checked={form.is_active}
              onChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
            />
          </div>
        </div>
        {occupied != null && (
          <p className={`-mt-1 text-[12px] font-[400] ${belowOccupied ? 'text-[#c0392b]' : 'text-[#9ca3af]'}`}>
            현재 <span className="font-[600] tabular-nums">{occupied}</span>명 배정
            {belowOccupied && ' · 정원이 현재 배정보다 적습니다'}
            <span className="font-[300] text-[#b0b6be]"> (신청 현황은 신청 관리에서)</span>
          </p>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[9px] border border-[#e2e5e9] bg-white px-4 py-2.5 text-[13px] font-[500] text-[#4b5563] transition-colors hover:bg-[#f7f8f9]"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit({ ...form, label: form.label.trim(), nights })}
          className="flex items-center gap-1.5 rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PenLine size={14} />
          {pending ? '저장 중…' : '저장'}
        </button>
      </div>
    </AdminModal>
  )
}

const inputClass =
  'w-full rounded-[9px] border border-[#e2e5e9] bg-white px-3 py-2.5 text-[13.5px] text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:border-[#1e3a5f]'
const selectClass =
  'w-full rounded-[9px] border border-[#e2e5e9] bg-white px-3 py-2.5 text-[13.5px] text-[#1f2937] outline-none focus:border-[#1e3a5f]'

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-[500] text-[#4b5563]">{label}</span>
      {children}
    </label>
  )
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-[13px] font-[400] text-[#374151]">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 accent-[#1e3a5f]"
      />
      {label}
    </label>
  )
}
