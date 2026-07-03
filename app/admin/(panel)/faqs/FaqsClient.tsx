'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { PenLine, Plus } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import AdminModal from '@/components/admin/AdminModal'
import type { FaqAdmin } from '@/lib/types'
import { createFaq, updateFaq, deleteFaq, type FaqInput } from './actions'

const EMPTY: FaqInput = { question: '', content: '', sort_order: 0, is_published: true }

type Editing = FaqAdmin | 'new' | null

export default function FaqsClient({ faqs }: { faqs: FaqAdmin[] }) {
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
          <Plus size={15} />새 FAQ 작성
        </button>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#eceef1] bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#eceef1] text-[12px] font-[500] text-[#9ca3af]">
              <th className="px-5 py-3 whitespace-nowrap">순서</th>
              <th className="px-2 py-3">질문</th>
              <th className="px-2 py-3">발행</th>
              <th className="px-5 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {faqs.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-5 py-16 text-center text-[13px] font-[300] text-[#9ca3af]">
                  등록된 FAQ가 없습니다. 우측 상단에서 새 FAQ를 작성하세요.
                </td>
              </tr>
            ) : (
              faqs.map((f) => (
                <tr key={f.id} className="border-b border-[#f1f3f5] last:border-0 hover:bg-[#f9fafb]">
                  <td className="px-5 py-3.5 text-[12.5px] font-[400] tabular-nums text-[#9ca3af]">{f.sort_order}</td>
                  <td className="px-2 py-3.5 text-[13.5px] font-[400] text-[#1f2937]">{f.question}</td>
                  <td className="px-2 py-3.5">
                    <Badge color={f.is_published ? 'emerald' : 'slate'} size="sm">
                      {f.is_published ? '발행' : '비공개'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setEditing(f)}
                      className="text-[13px] font-[400] text-[#3f6a99] hover:underline"
                    >
                      수정
                    </button>
                    <span className="px-1.5 text-[#e5e7eb]">|</span>
                    <DeleteButton id={f.id} onDone={() => router.refresh()} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {editing && (
        <FaqEditor
          editing={editing}
          pending={pending}
          onClose={() => setEditing(null)}
          onSubmit={(input) => {
            startTransition(async () => {
              const res = editing === 'new' ? await createFaq(input) : await updateFaq(editing.id, input)
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
        if (!confirm('이 FAQ를 삭제할까요? 되돌릴 수 없습니다.')) return
        startTransition(async () => {
          const res = await deleteFaq(id)
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

function FaqEditor({
  editing,
  pending,
  onClose,
  onSubmit,
}: {
  editing: FaqAdmin | 'new'
  pending: boolean
  onClose: () => void
  onSubmit: (input: FaqInput) => void
}) {
  const initial: FaqInput =
    editing === 'new'
      ? EMPTY
      : {
          question: editing.question,
          content: editing.content,
          sort_order: editing.sort_order,
          is_published: editing.is_published,
        }
  const [form, setForm] = useState<FaqInput>(initial)
  const canSubmit = !!form.question.trim() && !!form.content.trim() && !pending

  return (
    <AdminModal title={editing === 'new' ? '새 FAQ 작성' : 'FAQ 수정'} onClose={onClose}>
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-[500] text-[#4b5563]">질문</span>
          <input
            value={form.question}
            onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
            placeholder="자주 묻는 질문"
            className="w-full rounded-[9px] border border-[#e2e5e9] bg-white px-3 py-2.5 text-[13.5px] text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:border-[#1e3a5f]"
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block text-[12.5px] font-[500] text-[#4b5563]">답변</span>
          <textarea
            value={form.content}
            onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
            placeholder="답변 내용 (줄바꿈 지원)"
            rows={7}
            className="w-full resize-y rounded-[9px] border border-[#e2e5e9] bg-white px-3 py-2.5 text-[13.5px] leading-relaxed text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:border-[#1e3a5f]"
          />
        </label>

        <div className="flex items-end gap-6">
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-[500] text-[#4b5563]">정렬 순서</span>
            <input
              type="number"
              value={form.sort_order}
              onChange={(e) => setForm((f) => ({ ...f, sort_order: parseInt(e.target.value, 10) || 0 }))}
              className="w-28 rounded-[9px] border border-[#e2e5e9] bg-white px-3 py-2.5 text-[13.5px] tabular-nums text-[#1f2937] outline-none focus:border-[#1e3a5f]"
            />
          </label>
          <label className="flex cursor-pointer items-center gap-2 pb-2.5 text-[13px] font-[400] text-[#374151]">
            <input
              type="checkbox"
              checked={form.is_published}
              onChange={(e) => setForm((f) => ({ ...f, is_published: e.target.checked }))}
              className="h-4 w-4 accent-[#1e3a5f]"
            />
            발행(공개)
          </label>
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
          onClick={() => onSubmit({ ...form, question: form.question.trim(), content: form.content.trim() })}
          className="flex items-center gap-1.5 rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <PenLine size={14} />
          {pending ? '저장 중…' : '저장'}
        </button>
      </div>
    </AdminModal>
  )
}
