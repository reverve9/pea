'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, PenLine } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import AdminModal from '@/components/admin/AdminModal'
import { SCHEDULE_TYPE, formatPeriod } from '@/lib/display'
import type { SessionAdmin, CourseOption, ScheduleType } from '@/lib/types'
import { createSession, updateSession, deleteSession, type SessionInput } from './actions'

const TYPE_ORDER: ScheduleType[] = ['jikmu', 'weekday_2n', 'weekend_2n', 'weekend_1n']

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
}: {
  sessions: SessionAdmin[]
  courses: CourseOption[]
}) {
  const router = useRouter()
  const [editing, setEditing] = useState<Editing>(null)
  const [pending, startTransition] = useTransition()

  return (
    <>
      <div className="mb-4 flex justify-end">
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
              <th className="px-2 py-3 whitespace-nowrap">신청 / 정원</th>
              <th className="px-2 py-3">예비</th>
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
              sessions.map((s) => {
                const type = SCHEDULE_TYPE[s.schedule_type]
                const remaining = s.capacity - s.occupied
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
                    </td>
                    <td className="px-2 py-3.5">
                      <Badge color={type.color} size="sm">{type.label}</Badge>
                    </td>
                    <td className="px-2 py-3.5 whitespace-nowrap text-[12.5px] font-[300] tabular-nums text-[#4b5563]">
                      {formatPeriod(s.starts_on, s.ends_on, s.nights)}
                    </td>
                    <td className="px-2 py-3.5 whitespace-nowrap">
                      <span className="text-[13px] font-[500] tabular-nums text-[#1f2937]">{s.occupied}</span>
                      <span className="text-[12.5px] font-[300] tabular-nums text-[#9ca3af]"> / {s.capacity}</span>
                      <span
                        className={`ml-1.5 text-[11.5px] font-[400] tabular-nums ${
                          remaining <= 0 ? 'text-[#c2751a]' : 'text-[#9ca3af]'
                        }`}
                      >
                        {remaining > 0 ? `잔여 ${remaining}` : '정원 마감'}
                      </span>
                    </td>
                    <td className="px-2 py-3.5">
                      {s.waitlisted > 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#d97116] px-2 py-0.5 text-[11px] font-[600] leading-none text-white">
                          예비 {s.waitlisted}
                        </span>
                      ) : (
                        <span className="text-[12px] font-[300] text-[#d1d5db]">—</span>
                      )}
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
