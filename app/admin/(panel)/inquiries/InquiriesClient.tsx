'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Lock } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import AdminModal from '@/components/admin/AdminModal'
import { formatDate } from '@/lib/display'
import type { InquiryAdmin } from '@/lib/types'
import { replyInquiry, deleteInquiry } from './actions'

export default function InquiriesClient({ inquiries }: { inquiries: InquiryAdmin[] }) {
  const router = useRouter()
  const [replying, setReplying] = useState<InquiryAdmin | null>(null)
  const [pending, startTransition] = useTransition()

  const waiting = inquiries.filter((i) => i.status !== 'answered').length

  return (
    <>
      <p className="mb-4 text-[13px] font-[300] text-[#6b7280]">
        전체 {inquiries.length}건 · <span className="font-[500] text-[#8a4b00]">답변대기 {waiting}건</span>
      </p>

      <div className="overflow-hidden rounded-[12px] bg-white shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#eceef1] text-[12px] font-[500] text-[#9ca3af]">
              <th className="px-5 py-3">제목</th>
              <th className="px-2 py-3">작성자</th>
              <th className="px-2 py-3">연락처</th>
              <th className="px-2 py-3 whitespace-nowrap">작성일</th>
              <th className="px-2 py-3">상태</th>
              <th className="px-5 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {inquiries.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-16 text-center text-[13px] font-[300] text-[#9ca3af]">
                  등록된 문의가 없습니다.
                </td>
              </tr>
            ) : (
              inquiries.map((q) => (
                <tr key={q.id} className="border-b border-[#f1f3f5] last:border-0 hover:bg-[#f9fafb]">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {q.is_secret && <Lock size={12} className="shrink-0 text-[#9ca3af]" />}
                      <span className="text-[13.5px] font-[400] text-[#1f2937]">{q.title}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3.5 text-[13px] font-[400] text-[#374151]">{q.name ?? '익명'}</td>
                  <td className="px-2 py-3.5 text-[12.5px] font-[300] tabular-nums text-[#6b7280]">{q.phone}</td>
                  <td className="px-2 py-3.5 whitespace-nowrap text-[12.5px] font-[300] tabular-nums text-[#9ca3af]">
                    {formatDate(q.created_at.slice(0, 10))}
                  </td>
                  <td className="px-2 py-3.5">
                    <Badge color={q.status === 'answered' ? 'emerald' : 'amber'} size="sm">
                      {q.status === 'answered' ? '답변완료' : '답변대기'}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setReplying(q)}
                      className="text-[13px] font-[400] text-[#3f6a99] hover:underline"
                    >
                      답변
                    </button>
                    <span className="px-1.5 text-[#e5e7eb]">|</span>
                    <DeleteButton id={q.id} onDone={() => router.refresh()} />
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {replying && (
        <ReplyModal
          inquiry={replying}
          pending={pending}
          onClose={() => setReplying(null)}
          onSubmit={(reply) => {
            startTransition(async () => {
              const res = await replyInquiry(replying.id, reply)
              if (res.ok) {
                setReplying(null)
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
        if (!confirm('이 문의를 삭제할까요? 되돌릴 수 없습니다.')) return
        startTransition(async () => {
          const res = await deleteInquiry(id)
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

function ReplyModal({
  inquiry,
  pending,
  onClose,
  onSubmit,
}: {
  inquiry: InquiryAdmin
  pending: boolean
  onClose: () => void
  onSubmit: (reply: string) => void
}) {
  const [reply, setReply] = useState(inquiry.admin_reply ?? '')

  return (
    <AdminModal title="문의 상세 · 답변" onClose={onClose}>
      {/* 원문 */}
      <div className="rounded-[10px] bg-[#f3f6f9] p-4">
        <p className="text-[12px] font-[300] text-[#6b7280]">
          {inquiry.name ?? '익명'} · {inquiry.phone} · {formatDate(inquiry.created_at.slice(0, 10))}
        </p>
        <h3 className="mt-1 text-[14.5px] font-[500] text-[#1f2937]">{inquiry.title}</h3>
        <p className="mt-2 whitespace-pre-wrap text-[13px] font-[300] leading-relaxed text-[#374151]">
          {inquiry.content}
        </p>
      </div>

      {/* 답변 */}
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12.5px] font-[500] text-[#4b5563]">
          답변 <span className="font-[300] text-[#9ca3af]">(작성자에게 표시 — 열람용 비밀번호로 확인)</span>
        </span>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="답변을 작성하세요…"
          rows={6}
          className="w-full resize-y rounded-[9px] border border-[#e2e5e9] bg-white px-3 py-2.5 text-[13.5px] leading-relaxed text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:border-[#1e3a5f]"
        />
      </label>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[9px] border border-[#e2e5e9] bg-white px-4 py-2.5 text-[13px] font-[500] text-[#4b5563] transition-colors hover:bg-[#f7f8f9]"
        >
          취소
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => onSubmit(reply)}
          className="rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? '저장 중…' : '답변 등록'}
        </button>
      </div>
    </AdminModal>
  )
}
