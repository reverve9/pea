'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Pin, PenLine, Plus } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import AdminModal from '@/components/admin/AdminModal'
import { NOTICE_CATEGORY, formatDate } from '@/lib/display'
import type { NoticeAdmin, NoticeCategory } from '@/lib/types'
import { createNotice, updateNotice, deleteNotice, type NoticeInput } from './actions'

const CATEGORY_ORDER: NoticeCategory[] = ['general', 'program', 'result']
const EMPTY: NoticeInput = { title: '', content: '', category: 'general', is_pinned: false, is_published: true }

// 편집 대상: 'new'(신규) | NoticeAdmin(수정) | null(닫힘)
type Editing = NoticeAdmin | 'new' | null

export default function NoticesClient({ notices }: { notices: NoticeAdmin[] }) {
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
          <Plus size={15} />새 공지 작성
        </button>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#eceef1] bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#eceef1] text-[12px] font-[500] text-[#9ca3af]">
              <th className="px-5 py-3">카테고리</th>
              <th className="px-2 py-3">제목</th>
              <th className="px-2 py-3">발행</th>
              <th className="px-2 py-3 whitespace-nowrap">작성일</th>
              <th className="px-5 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {notices.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-5 py-16 text-center text-[13px] font-[300] text-[#9ca3af]">
                  등록된 공지가 없습니다. 우측 상단에서 새 공지를 작성하세요.
                </td>
              </tr>
            ) : (
              notices.map((n) => {
                const cat = NOTICE_CATEGORY[n.category]
                return (
                  <tr key={n.id} className="border-b border-[#f1f3f5] last:border-0 hover:bg-[#f9fafb]">
                    <td className="px-5 py-3.5">
                      <Badge color={cat.color} size="sm">{cat.label}</Badge>
                    </td>
                    <td className="px-2 py-3.5">
                      <div className="flex items-center gap-1.5">
                        {n.is_pinned && <Pin size={13} className="shrink-0 text-[#a65546]" fill="currentColor" />}
                        <span className="text-[13.5px] font-[400] text-[#1f2937]">{n.title}</span>
                      </div>
                    </td>
                    <td className="px-2 py-3.5">
                      <Badge color={n.is_published ? 'emerald' : 'slate'} size="sm">
                        {n.is_published ? '발행' : '비공개'}
                      </Badge>
                    </td>
                    <td className="px-2 py-3.5 whitespace-nowrap text-[12.5px] font-[300] tabular-nums text-[#9ca3af]">
                      {formatDate(n.created_at.slice(0, 10))}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => setEditing(n)}
                        className="text-[13px] font-[400] text-[#3f6a99] hover:underline"
                      >
                        수정
                      </button>
                      <span className="px-1.5 text-[#e5e7eb]">|</span>
                      <DeleteButton id={n.id} onDone={() => router.refresh()} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <NoticeEditor
          editing={editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSubmit={(input) => {
            startTransition(async () => {
              const res = editing === 'new' ? await createNotice(input) : await updateNotice(editing.id, input)
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
        if (!confirm('이 공지를 삭제할까요? 되돌릴 수 없습니다.')) return
        startTransition(async () => {
          const res = await deleteNotice(id)
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

function NoticeEditor({
  editing,
  pending,
  onClose,
  onSubmit,
}: {
  editing: NoticeAdmin | 'new'
  pending: boolean
  onClose: () => void
  onSubmit: (input: NoticeInput) => void
}) {
  const initial: NoticeInput =
    editing === 'new'
      ? EMPTY
      : {
          title: editing.title,
          content: editing.content,
          category: editing.category,
          is_pinned: editing.is_pinned,
          is_published: editing.is_published,
        }
  const [form, setForm] = useState<NoticeInput>(initial)
  const canSubmit = !!form.title.trim() && !!form.content.trim() && !pending

  return (
    <AdminModal title={editing === 'new' ? '새 공지 작성' : '공지 수정'} onClose={onClose}>
      <div className="space-y-4">
        <Field label="카테고리">
          <select
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as NoticeCategory }))}
            className="w-full rounded-[9px] border border-[#e2e5e9] bg-white px-3 py-2.5 text-[13.5px] text-[#1f2937] outline-none focus:border-[#1e3a5f]"
          >
            {CATEGORY_ORDER.map((c) => (
              <option key={c} value={c}>{NOTICE_CATEGORY[c].label}</option>
            ))}
          </select>
        </Field>

        <Field label="제목">
          <input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="공지 제목"
            className="w-full rounded-[9px] border border-[#e2e5e9] bg-white px-3 py-2.5 text-[13.5px] text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:border-[#1e3a5f]"
          />
        </Field>

        <Field label="내용">
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="공지 내용 (줄바꿈·마크다운 지원)"
            rows={8}
            className="w-full resize-y rounded-[9px] border border-[#e2e5e9] bg-white px-3 py-2.5 text-[13.5px] leading-relaxed text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:border-[#1e3a5f]"
          />
        </Field>

        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Check
            label="상단 고정"
            checked={form.is_pinned}
            onChange={(v) => setForm((f) => ({ ...f, is_pinned: v }))}
          />
          <Check
            label="발행(공개)"
            checked={form.is_published}
            onChange={(v) => setForm((f) => ({ ...f, is_published: v }))}
          />
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
          onClick={() => onSubmit({ ...form, title: form.title.trim(), content: form.content.trim() })}
          className="flex items-center gap-1.5 rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PenLine size={14} />
          {pending ? '저장 중…' : '저장'}
        </button>
      </div>
    </AdminModal>
  )
}

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
