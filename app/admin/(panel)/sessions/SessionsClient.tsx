'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, PenLine, Tags, Save, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import AdminModal from '@/components/admin/AdminModal'
import AdminDateField from '@/components/admin/AdminDateField'
import AdminListHeader, { AdminHeaderButton } from '@/components/admin/AdminListHeader'
import { SCHEDULE_TYPE, formatPeriod, formatKRW } from '@/lib/display'
import type { SessionAdmin, CourseOption, ScheduleType, PriceItemAdmin, PriceCategory, SessionPriceOverride } from '@/lib/types'
import { createSession, updateSession, deleteSession, completeSessionApplications, syncSessionOverrides, savePriceItems, type SessionInput } from './actions'
import BaseGrid, { initBaseAmounts, basePatches, baseHasInvalid, baseDirtyCount } from './BaseGrid'

const TYPE_ORDER: ScheduleType[] = ['jikmu', 'weekend_2n', 'weekday_2n', 'weekend_1n']
// 자율패키지 하위 옵션 표시 순서(오너 지정 2026-08-05): 주말2박 · 주중2박 · 주말1박.
const JAYUL_VARIANTS: ScheduleType[] = ['weekend_2n', 'weekday_2n', 'weekend_1n']

// 차수 요금 조정(오버라이드) 섹션의 카테고리 표시 순서·라벨.
const PRICE_CATEGORIES: { key: PriceCategory; label: string }[] = [
  { key: 'jikmu_base', label: '직무 기본가' },
  { key: 'room_surcharge', label: '개별객실 추가금' },
  { key: 'pkg_price', label: '자율 패키지가' },
  { key: 'rental', label: '렌탈·옵션' },
]

// 이 차수가 실제로 받는 요금 항목만 — 유형별 필터(신청폼 computeJikmu/computeJayul 과 동일 기준).
//  직무 = 기본가·개별객실·렌탈 / 자율(변형) = 해당 변형 pkg_price + 렌탈. 관계없는 항목은 안 보인다.
function relevantPriceItems(items: PriceItemAdmin[], st: ScheduleType): PriceItemAdmin[] {
  if (st === 'jikmu') return items.filter((it) => it.category !== 'pkg_price')
  return items.filter(
    (it) => it.category === 'rental' || (it.category === 'pkg_price' && it.item_key.startsWith(`pkg_${st}_`)),
  )
}

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
  const [baseOpen, setBaseOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  // 차수별 오버라이드 개수 — 목록에 '요금조정 N' 마커 표시용.
  const overrideCount = React.useMemo(() => {
    const m: Record<string, number> = {}
    for (const o of overrides) m[o.session_id] = (m[o.session_id] ?? 0) + 1
    return m
  }, [overrides])

  // 리스트는 계속 쌓이는 평면 목록 — 헤더 행 없이, '유형'을 컬럼으로 두고 그룹 첫 행에만 표시(반복 금지).
  // 정렬: 직무연수 → 자율(주말2박·주말1박·주중2박), 각 유형 내부 시작일순.
  const ordered = React.useMemo(() => {
    const groupOrder: ScheduleType[] = ['jikmu', ...JAYUL_VARIANTS]
    return groupOrder.flatMap((t) =>
      sessions.filter((s) => s.schedule_type === t).sort((a, b) => a.starts_on.localeCompare(b.starts_on)),
    )
  }, [sessions])

  // 차수 한 행. showType/showSchedule = 각 그룹의 첫 행일 때만 값 표시(연속 행은 빈칸 — 컬럼 값 반복 금지).
  //  유형 = 직무연수/자율패키지(텍스트·상위 그룹), 일정구분 = 주말2박 등(배지·하위).
  const renderRow = (s: SessionAdmin, showType: boolean, showSchedule: boolean) => {
    const type = SCHEDULE_TYPE[s.schedule_type]
    return (
      <tr
        key={s.id}
        className={`border-t hover:bg-[#f9fafb] ${showType ? 'border-[#e2e6ea]' : 'border-[#f4f5f7]'} ${s.is_active ? '' : 'text-[#9ca3af]'}`}
      >
        <td className="px-5 py-3.5 align-top text-[13px] font-[600] text-[#1f2937]">
          {showType && (s.schedule_type === 'jikmu' ? '직무연수' : '자율패키지')}
        </td>
        <td className="px-2 py-3.5 align-top">
          {showSchedule && (
            <Badge color={type.color} size="sm">
              {type.label}
            </Badge>
          )}
        </td>
        <td className="px-2 py-3.5">
          <div className="text-[13.5px] font-[500] text-[#1f2937]">{s.label}</div>
          <div className="text-[11.5px] font-[300] text-[#9ca3af]">{s.course_name}</div>
          {overrideCount[s.id] > 0 && (
            <span className="mt-1 inline-flex items-center gap-1 rounded-[4px] bg-[#eef2f7] px-1.5 py-0.5 text-[10.5px] font-[500] leading-none text-[#3f6a99]">
              <Tags size={10} />요금조정 {overrideCount[s.id]}
            </span>
          )}
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
          <CompleteButton session={s} onDone={() => router.refresh()} />
          <button
            type="button"
            onClick={() => setEditing(s)}
            className="text-[13px] font-[400] text-[#3f6a99] hover:underline"
          >
            수정
          </button>
          <span className="px-1.5 text-[#e5e7eb]">|</span>
          <DeleteButton id={s.id} onDone={() => router.refresh()} />
        </td>
      </tr>
    )
  }

  return (
    <>
      <AdminListHeader
        count={sessions.length}
        right={
          <>
            <AdminHeaderButton variant="secondary" onClick={() => setBaseOpen(true)}>
              <Tags size={15} />기본 요금
            </AdminHeaderButton>
            <AdminHeaderButton onClick={() => setEditing('new')}>
              <Plus size={15} />새 회차 개설
            </AdminHeaderButton>
          </>
        }
      />

      <div className="overflow-hidden rounded-[12px] bg-white shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#eceef1] text-[12px] font-[500] text-[#9ca3af]">
              <th className="px-5 py-3">유형</th>
              <th className="px-2 py-3">일정구분</th>
              <th className="px-2 py-3">회차</th>
              <th className="px-2 py-3 whitespace-nowrap">일정</th>
              <th className="px-2 py-3 whitespace-nowrap">정원</th>
              <th className="px-2 py-3">활성</th>
              <th className="px-5 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {sessions.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-16 text-center text-[13px] font-[300] text-[#9ca3af]">
                  개설된 회차가 없습니다. 우측 상단에서 새 회차를 개설하세요.
                </td>
              </tr>
            ) : (
              ordered.map((s, i) => {
                const prev = ordered[i - 1]
                const courseType = (t: ScheduleType) => (t === 'jikmu' ? 'jikmu' : 'jayul')
                const showType = i === 0 || courseType(prev.schedule_type) !== courseType(s.schedule_type)
                const showSchedule = i === 0 || prev.schedule_type !== s.schedule_type
                return renderRow(s, showType, showSchedule)
              })
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <SessionEditor
          editing={editing}
          courses={courses}
          items={priceItems}
          overrides={editing === 'new' ? [] : overrides.filter((o) => o.session_id === editing.id)}
          pending={pending}
          onClose={() => setEditing(null)}
          onSubmit={(input, ov) => {
            startTransition(async () => {
              // 회차 저장 → 같은 흐름에서 이 차수 요금 오버라이드 동기화(생성은 새 id 로).
              if (editing === 'new') {
                const res = await createSession(input)
                if (!res.ok) return alert(res.error)
                if (ov.length > 0) {
                  const r2 = await syncSessionOverrides(res.id, ov)
                  if (!r2.ok) return alert(r2.error)
                }
              } else {
                const res = await updateSession(editing.id, input)
                if (!res.ok) return alert(res.error)
                const r2 = await syncSessionOverrides(editing.id, ov)
                if (!r2.ok) return alert(r2.error)
              }
              setEditing(null)
              router.refresh()
            })
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
          className="rounded-[9px] bg-[#eef1f4] px-4 py-2.5 text-[13px] font-[500] text-[#4b5563] transition-colors hover:bg-[#e4e8ec]"
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

// 회차 일괄 이수처리 — 항상 노출, 종료일(ends_on) 지난 회차에만 활성화. 그 회차 입금확인(paid) 신청을 일괄 연수완료.
function CompleteButton({ session, onDone }: { session: SessionAdmin; onDone: () => void }) {
  const [pending, startTransition] = useTransition()
  const today = new Date().toISOString().slice(0, 10)
  const ended = session.ends_on < today
  return (
    <>
      <button
        type="button"
        disabled={pending || !ended}
        title={ended ? undefined : '회차 종료 후 일괄 이수처리할 수 있습니다.'}
        onClick={() => {
          if (!confirm(`[${session.label}] 종료된 회차입니다. 입금확인 신청을 일괄 연수완료 처리할까요?\n(입금대기·취소·환불 건은 제외됩니다. 노쇼는 신청관리에서 개별 되돌릴 수 있습니다.)`)) return
          startTransition(async () => {
            const res = await completeSessionApplications(session.id)
            if (res.ok) {
              alert(`${res.count ?? 0}건을 연수완료 처리했습니다.`)
              onDone()
            } else alert(res.error)
          })
        }}
        className="text-[13px] font-[400] text-[#1e6b4f] hover:underline disabled:cursor-not-allowed disabled:text-[#c7ccd2] disabled:no-underline"
      >
        일괄완료
      </button>
      <span className="px-1.5 text-[#e5e7eb]">|</span>
    </>
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
  items,
  overrides,
  pending,
  onClose,
  onSubmit,
}: {
  editing: SessionAdmin | 'new'
  courses: CourseOption[]
  items: PriceItemAdmin[]
  overrides: SessionPriceOverride[]
  pending: boolean
  onClose: () => void
  onSubmit: (input: SessionInput, overrides: { item_key: string; amount: number }[]) => void
}) {
  const occupied = editing !== 'new' ? editing.occupied : null
  // 이 차수 요금 — 기본가를 실제 값으로 채워두고(수정 가능함이 직관적으로 보이게), 오버라이드 있으면 덮어씀.
  // 기본가와 같은 값은 저장 시 오버라이드로 안 넘어간다(sparse).
  const [priceVals, setPriceVals] = useState<Record<string, string>>(() => {
    const m: Record<string, string> = {}
    for (const it of items) m[it.item_key] = String(it.amount)
    for (const o of overrides) m[o.item_key] = String(o.amount)
    return m
  })
  // 요금 아코디언 — 조정된 값이 있는 카테고리는 처음부터 펼쳐서 눈에 띄게, 나머진 접힘.
  const [openCats, setOpenCats] = useState<Set<string>>(() => {
    const s = new Set<string>()
    for (const o of overrides) {
      const it = items.find((i) => i.item_key === o.item_key)
      if (it) s.add(it.category)
    }
    return s
  })
  const toggleCat = (k: string) =>
    setOpenCats((s) => {
      const n = new Set(s)
      if (n.has(k)) n.delete(k)
      else n.add(k)
      return n
    })
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
  // 이 차수 유형이 실제로 받는 항목만 — 유형(form.schedule_type) 바꾸면 반응해서 갱신.
  const relevant = React.useMemo(() => relevantPriceItems(items, form.schedule_type), [items, form.schedule_type])
  // 저장 시 넘길 sparse 오버라이드 — relevant 중 비었거나 기본가와 같지 않은 항목만.
  const buildOverrides = () => {
    const ov: { item_key: string; amount: number }[] = []
    for (const it of relevant) {
      const raw = priceVals[it.item_key]
      if (raw == null || raw.trim() === '') continue
      const n = Math.trunc(Number(raw))
      if (!Number.isFinite(n) || n < 0 || n === it.amount) continue
      ov.push({ item_key: it.item_key, amount: n })
    }
    return ov
  }
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
    <AdminModal title={editing === 'new' ? '새 회차 개설' : '회차 수정'} onClose={onClose} maxWidth={860}>
      <div className="grid gap-x-6 gap-y-4 md:grid-cols-2">
        {/* 좌: 일정·정원 */}
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
            <AdminDateField
              value={form.starts_on}
              onChange={(iso) => setForm((f) => ({ ...f, starts_on: iso }))}
              className={inputClass}
            />
          </Field>
          <Field label="종료일">
            <AdminDateField
              value={form.ends_on}
              onChange={(iso) => setForm((f) => ({ ...f, ends_on: iso }))}
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

        {/* 우: 이 차수 요금 — 이 유형이 받는 항목만, 카테고리 아코디언(평소엔 헤더만). 일정·정원과 한 모달. */}
        {relevant.length > 0 && (
          <div>
            <div className="mb-1 text-[13px] font-[600] text-[#1f2937]">이 차수 요금</div>
            <p className="mb-2.5 text-[12px] font-[300] leading-relaxed text-[#6b7280]">
              기본 요금이 채워져 있습니다. 이 차수만 다르게 받을 항목의 금액을 바꾸세요. 그대로 두면 기본가가 적용됩니다.
            </p>
            <div className="space-y-1.5">
              {PRICE_CATEGORIES.map((cat) => {
                const rows = relevant.filter((it) => it.category === cat.key)
                if (rows.length === 0) return null
                const adj = rows.filter((it) => {
                  const raw = priceVals[it.item_key]
                  return raw != null && raw.trim() !== '' && Math.trunc(Number(raw)) !== it.amount
                }).length
                const open = openCats.has(cat.key)
                return (
                  <div key={cat.key} className="overflow-hidden rounded-[9px] bg-[#f6f8fa]">
                    <button
                      type="button"
                      onClick={() => toggleCat(cat.key)}
                      className="flex w-full items-center justify-between px-3.5 py-2.5 text-left transition-colors hover:bg-[#eef1f4]"
                    >
                      <span className="flex items-center gap-2 text-[12.5px] font-[500] text-[#374151]">
                        {cat.label}
                        {adj > 0 && (
                          <span className="rounded-[4px] bg-[#fdf1e6] px-1.5 py-0.5 text-[10.5px] font-[500] text-[#c2751a]">
                            조정 {adj}
                          </span>
                        )}
                      </span>
                      <ChevronDown size={15} className={`shrink-0 text-[#9ca3af] transition-transform ${open ? 'rotate-180' : ''}`} />
                    </button>
                    {open && (
                      <div className="space-y-1 px-3.5 pb-3">
                        {rows.map((it) => {
                          const raw = priceVals[it.item_key] ?? ''
                          const changed = raw.trim() !== '' && Math.trunc(Number(raw)) !== it.amount
                          return (
                            <div key={it.item_key} className="flex items-center gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="truncate text-[12.5px] font-[400] text-[#374151]">{it.label}</div>
                                <div className="text-[11px] font-[300] tabular-nums text-[#9ca3af]">
                                  기본 {formatKRW(it.amount)}
                                  {changed && <span className="ml-1.5 font-[500] text-[#c2751a]">· 조정됨</span>}
                                </div>
                              </div>
                              <div className="relative shrink-0">
                                <input
                                  type="number"
                                  min={0}
                                  step={500}
                                  inputMode="numeric"
                                  value={priceVals[it.item_key] ?? ''}
                                  onChange={(e) => setPriceVals((v) => ({ ...v, [it.item_key]: e.target.value }))}
                                  className={`admin-field w-28 rounded-[7px] py-1.5 pl-2.5 pr-7 text-right text-[12.5px] font-[500] tabular-nums text-[#1f2937] outline-none focus:bg-[#eef2f6] ${
                                    changed ? 'bg-[#fdf4e8]' : 'bg-white'
                                  }`}
                                />
                                <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] font-[300] text-[#9ca3af]">
                                  원
                                </span>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            <p className="mt-2.5 text-[11.5px] font-[300] text-[#9ca3af]">
              기본 요금(모든 차수 공통)은 상단 <span className="font-[500] text-[#6b7280]">기본 요금</span>에서.
            </p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[9px] bg-[#eef1f4] px-4 py-2.5 text-[13px] font-[500] text-[#4b5563] transition-colors hover:bg-[#e4e8ec]"
        >
          취소
        </button>
        <button
          type="button"
          disabled={!canSubmit}
          onClick={() => onSubmit({ ...form, label: form.label.trim(), nights }, buildOverrides())}
          className="flex items-center gap-1.5 rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PenLine size={14} />
          {pending ? '저장 중…' : '저장'}
        </button>
      </div>
    </AdminModal>
  )
}

// 테두리 없음 — 배경 채움(틴트)만. 포커스 아웃라인은 .admin-field 로 억제. [[no-borders-rule]]
const inputClass =
  'admin-field w-full rounded-[9px] bg-[#f4f6f8] px-3 py-2.5 text-[13.5px] text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:bg-[#eaeef2]'
const selectClass =
  'admin-select admin-field w-full rounded-[9px] bg-[#f4f6f8] px-3 py-2.5 text-[13.5px] text-[#1f2937] outline-none focus:bg-[#eaeef2]'

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
