'use client'

import React, { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronRight, Lock } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import AdminModal from '@/components/admin/AdminModal'
import { formatDate, REFUND_STATUS, MODIFICATION_STATUS } from '@/lib/display'
import type {
  RefundRequestAdmin,
  RefundStatus,
  ModificationRequestAdmin,
  ModificationStatus,
} from '@/lib/types'
import {
  setRefundStatus,
  saveRefundMemo,
  setModificationStatus,
  replyModification,
} from './actions'

const REFUND_FLOW: RefundStatus[] = ['requested', 'confirmed', 'completed']
const MOD_FLOW: ModificationStatus[] = ['pending', 'confirmed', 'done']

export default function RequestsClient({
  refunds,
  modifications,
}: {
  refunds: RefundRequestAdmin[]
  modifications: ModificationRequestAdmin[]
}) {
  const refundWaiting = refunds.filter((r) => r.status === 'requested').length
  const modWaiting = modifications.filter((m) => m.status === 'pending').length

  return (
    <div className="space-y-10">
      <RefundSection refunds={refunds} waiting={refundWaiting} />
      <ModificationSection modifications={modifications} waiting={modWaiting} />
    </div>
  )
}

// ══ 환불 요청 ══
function RefundSection({ refunds, waiting }: { refunds: RefundRequestAdmin[]; waiting: number }) {
  const router = useRouter()
  const [detail, setDetail] = useState<RefundRequestAdmin | null>(null)

  return (
    <section>
      <SectionHead title="환불 요청" total={refunds.length} waiting={waiting} waitLabel="신청대기" />
      <div className="overflow-hidden rounded-[12px] bg-white shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#eceef1] text-[12px] font-[500] text-[#9ca3af]">
              <th className="px-5 py-3">신청번호</th>
              <th className="px-2 py-3">신청자</th>
              <th className="px-2 py-3">연락처</th>
              <th className="px-2 py-3">사유</th>
              <th className="px-2 py-3 whitespace-nowrap">신청일</th>
              <th className="px-2 py-3">상태</th>
              <th className="px-5 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {refunds.length === 0 ? (
              <EmptyRow colSpan={7} label="환불 요청이 없습니다." />
            ) : (
              refunds.map((r) => (
                <tr key={r.id} className="border-b border-[#f1f3f5] last:border-0 hover:bg-[#f9fafb]">
                  <td className="px-5 py-3.5 text-[12.5px] font-[500] tabular-nums text-[#1f2937]">
                    {r.application_no ?? <span className="text-[#c0392b]">신청삭제</span>}
                  </td>
                  <td className="px-2 py-3.5 text-[13px] font-[400] text-[#374151]">{r.applicant_name ?? '—'}</td>
                  <td className="px-2 py-3.5 text-[12.5px] font-[300] tabular-nums text-[#6b7280]">{r.phone}</td>
                  <td className="max-w-[180px] truncate px-2 py-3.5 text-[12.5px] font-[300] text-[#6b7280]">
                    {r.reason || '—'}
                  </td>
                  <td className="px-2 py-3.5 whitespace-nowrap text-[12.5px] font-[300] tabular-nums text-[#9ca3af]">
                    {formatDate(r.created_at.slice(0, 10))}
                  </td>
                  <td className="px-2 py-3.5">
                    <Badge color={REFUND_STATUS[r.status].color} size="sm">
                      {REFUND_STATUS[r.status].label}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setDetail(r)}
                      className="text-[13px] font-[400] text-[#3f6a99] hover:underline"
                    >
                      상세
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detail && <RefundModal req={detail} onClose={() => setDetail(null)} onChanged={() => router.refresh()} />}
    </section>
  )
}

function RefundModal({
  req,
  onClose,
  onChanged,
}: {
  req: RefundRequestAdmin
  onClose: () => void
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [memo, setMemo] = useState(req.admin_memo ?? '')

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        onClose()
        onChanged()
      } else alert(res.error)
    })
  }

  return (
    <AdminModal title="환불 요청 상세" onClose={onClose}>
      <div className="rounded-[10px] bg-[#f3f6f9] p-4">
        <div className="flex items-center gap-2">
          <Badge color={REFUND_STATUS[req.status].color} size="sm">
            {REFUND_STATUS[req.status].label}
          </Badge>
          <span className="text-[12.5px] font-[300] text-[#6b7280]">
            {req.application_no ?? '신청삭제'} · {formatDate(req.created_at.slice(0, 10))}
          </span>
        </div>
        <p className="mt-2 text-[14px] font-[500] text-[#1f2937]">
          {req.applicant_name ?? '—'} · <span className="tabular-nums font-[300]">{req.phone}</span>
        </p>
        <div className="mt-3 space-y-1.5 text-[13px] font-[300] text-[#374151]">
          <p>
            <span className="text-[#9ca3af]">환불계좌</span> {req.refund_account || '(미입력)'}
          </p>
          <p className="whitespace-pre-wrap">
            <span className="text-[#9ca3af]">사유</span> {req.reason || '(미입력)'}
          </p>
        </div>
      </div>

      <StatusStepper
        flow={REFUND_FLOW}
        current={req.status}
        labelMap={REFUND_STATUS}
        pending={pending}
        onPick={(s) => run(() => setRefundStatus(req.id, s))}
      />

      <MemoField
        value={memo}
        onChange={setMemo}
        pending={pending}
        dirty={memo.trim() !== (req.admin_memo ?? '')}
        onClose={onClose}
        onSave={() => run(() => saveRefundMemo(req.id, memo))}
      />
    </AdminModal>
  )
}

// ══ 수정 요청 ══
function ModificationSection({
  modifications,
  waiting,
}: {
  modifications: ModificationRequestAdmin[]
  waiting: number
}) {
  const router = useRouter()
  const [detail, setDetail] = useState<ModificationRequestAdmin | null>(null)

  return (
    <section>
      <SectionHead title="수정 요청" total={modifications.length} waiting={waiting} waitLabel="신청대기" />
      <div className="overflow-hidden rounded-[12px] bg-white shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#eceef1] text-[12px] font-[500] text-[#9ca3af]">
              <th className="px-5 py-3">신청번호</th>
              <th className="px-2 py-3">신청자</th>
              <th className="px-2 py-3">연락처</th>
              <th className="px-2 py-3">수정내용</th>
              <th className="px-2 py-3 whitespace-nowrap">신청일</th>
              <th className="px-2 py-3">상태</th>
              <th className="px-5 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {modifications.length === 0 ? (
              <EmptyRow colSpan={7} label="수정 요청이 없습니다." />
            ) : (
              modifications.map((m) => (
                <tr key={m.id} className="border-b border-[#f1f3f5] last:border-0 hover:bg-[#f9fafb]">
                  <td className="px-5 py-3.5 text-[12.5px] font-[500] tabular-nums text-[#1f2937]">
                    {m.application_no ?? <span className="text-[#c0392b]">신청삭제</span>}
                  </td>
                  <td className="px-2 py-3.5 text-[13px] font-[400] text-[#374151]">{m.applicant_name ?? '—'}</td>
                  <td className="px-2 py-3.5 text-[12.5px] font-[300] tabular-nums text-[#6b7280]">{m.phone}</td>
                  <td className="max-w-[180px] px-2 py-3.5">
                    <div className="flex items-center gap-1.5">
                      {m.is_secret && <Lock size={12} className="shrink-0 text-[#9ca3af]" />}
                      <span className="truncate text-[12.5px] font-[300] text-[#6b7280]">{m.content || '—'}</span>
                    </div>
                  </td>
                  <td className="px-2 py-3.5 whitespace-nowrap text-[12.5px] font-[300] tabular-nums text-[#9ca3af]">
                    {formatDate(m.created_at.slice(0, 10))}
                  </td>
                  <td className="px-2 py-3.5">
                    <Badge color={MODIFICATION_STATUS[m.status].color} size="sm">
                      {MODIFICATION_STATUS[m.status].label}
                    </Badge>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => setDetail(m)}
                      className="text-[13px] font-[400] text-[#3f6a99] hover:underline"
                    >
                      상세
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <ModificationModal req={detail} onClose={() => setDetail(null)} onChanged={() => router.refresh()} />
      )}
    </section>
  )
}

function ModificationModal({
  req,
  onClose,
  onChanged,
}: {
  req: ModificationRequestAdmin
  onClose: () => void
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [reply, setReply] = useState(req.admin_reply ?? '')

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        onClose()
        onChanged()
      } else alert(res.error)
    })
  }

  return (
    <AdminModal title="수정 요청 상세" onClose={onClose}>
      <div className="rounded-[10px] bg-[#f3f6f9] p-4">
        <div className="flex items-center gap-2">
          <Badge color={MODIFICATION_STATUS[req.status].color} size="sm">
            {MODIFICATION_STATUS[req.status].label}
          </Badge>
          <span className="text-[12.5px] font-[300] text-[#6b7280]">
            {req.application_no ?? '신청삭제'} · {formatDate(req.created_at.slice(0, 10))}
          </span>
        </div>
        <p className="mt-2 text-[14px] font-[500] text-[#1f2937]">
          {req.applicant_name ?? '—'} · <span className="tabular-nums font-[300]">{req.phone}</span>
        </p>
        <p className="mt-3 whitespace-pre-wrap text-[13px] font-[300] leading-relaxed text-[#374151]">
          {req.content || '(내용 없음)'}
        </p>
      </div>

      {/* 상태: 신청대기 → 수정확인 → 수정완료 + 예외(수정반려) */}
      <StatusStepper
        flow={MOD_FLOW}
        current={req.status}
        labelMap={MODIFICATION_STATUS}
        pending={pending}
        onPick={(s) => run(() => setModificationStatus(req.id, s))}
        exception={{
          status: 'rejected',
          label: MODIFICATION_STATUS.rejected.label,
          onPick: () => run(() => setModificationStatus(req.id, 'rejected')),
        }}
      />

      {/* 답글 */}
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12.5px] font-[500] text-[#4b5563]">
          답글 <span className="font-[300] text-[#9ca3af]">(작성자 마이페이지에 표시)</span>
        </span>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          rows={4}
          placeholder="답글을 작성하세요…"
          className="w-full resize-y rounded-[9px] border border-[#e2e5e9] bg-white px-3 py-2.5 text-[13.5px] leading-relaxed text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:border-[#1e3a5f]"
        />
      </label>

      <div className="mt-5 flex justify-end gap-2">
        <ModalCloseBtn onClose={onClose} />
        <button
          type="button"
          disabled={pending || reply.trim() === (req.admin_reply ?? '')}
          onClick={() => run(() => replyModification(req.id, reply))}
          className="rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? '저장 중…' : '답글 등록'}
        </button>
      </div>
    </AdminModal>
  )
}

// ── 공용 조각 ──
function SectionHead({
  title,
  total,
  waiting,
  waitLabel,
}: {
  title: string
  total: number
  waiting: number
  waitLabel: string
}) {
  return (
    <div className="mb-3 flex items-baseline gap-2">
      <h2 className="text-[15px] font-[600] text-[#1f2937]">{title}</h2>
      <span className="text-[12.5px] font-[300] text-[#6b7280]">
        전체 {total}건
        {waiting > 0 && (
          <>
            {' · '}
            <span className="font-[500] text-[#8a4b00]">
              {waitLabel} {waiting}건
            </span>
          </>
        )}
      </span>
    </div>
  )
}

function EmptyRow({ colSpan, label }: { colSpan: number; label: string }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-5 py-14 text-center text-[13px] font-[300] text-[#9ca3af]">
        {label}
      </td>
    </tr>
  )
}

// 상태 스테퍼 — 순방향 진행(flow) + 선택적 예외 액션(danger 톤, 분리).
function StatusStepper<S extends string>({
  flow,
  current,
  labelMap,
  pending,
  onPick,
  exception,
}: {
  flow: S[]
  current: S
  labelMap: Record<S, { label: string }>
  pending: boolean
  onPick: (s: S) => void
  exception?: { status: S; label: string; onPick: () => void }
}) {
  return (
    <div className="mt-4">
      <p className="mb-2 text-[12.5px] font-[500] text-[#4b5563]">상태 변경</p>
      <div className="flex items-center gap-1">
        {flow.map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <ChevronRight size={14} className="shrink-0 text-[#cbd2da]" />}
            <button
              type="button"
              disabled={pending || current === s}
              onClick={() => {
                if (!confirm(`상태를 "${labelMap[s].label}"(으)로 변경할까요?`)) return
                onPick(s)
              }}
              className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-[500] transition-colors disabled:cursor-default ${
                current === s
                  ? 'bg-[#1e3a5f] text-white'
                  : 'border border-[#e2e5e9] bg-white text-[#4b5563] hover:bg-[#f7f8f9] disabled:opacity-40'
              }`}
            >
              {labelMap[s].label}
            </button>
          </React.Fragment>
        ))}
      </div>
      {exception && (
        <div className="mt-3 flex items-center gap-2 border-t border-[#f1f3f5] pt-3">
          <span className="shrink-0 text-[11px] font-[400] text-[#9ca3af]">예외 처리</span>
          <button
            type="button"
            disabled={pending || current === exception.status}
            onClick={() => {
              if (!confirm(`상태를 "${exception.label}"(으)로 변경할까요?`)) return
              exception.onPick()
            }}
            className={`rounded-[8px] px-3 py-1.5 text-[12px] font-[500] transition-colors disabled:cursor-default ${
              current === exception.status
                ? 'bg-[#8f3a2a] text-white'
                : 'border border-[#e2c9c3] bg-white text-[#8f3a2a] hover:bg-[#fbf3f1] disabled:opacity-40'
            }`}
          >
            {exception.label}
          </button>
        </div>
      )}
    </div>
  )
}

function MemoField({
  value,
  onChange,
  pending,
  dirty,
  onClose,
  onSave,
}: {
  value: string
  onChange: (v: string) => void
  pending: boolean
  dirty: boolean
  onClose: () => void
  onSave: () => void
}) {
  return (
    <>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12.5px] font-[500] text-[#4b5563]">
          관리자 메모 <span className="font-[300] text-[#9ca3af]">(내부용)</span>
        </span>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          placeholder="내부 메모…"
          className="w-full resize-y rounded-[9px] border border-[#e2e5e9] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:border-[#1e3a5f]"
        />
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <ModalCloseBtn onClose={onClose} />
        <button
          type="button"
          disabled={pending || !dirty}
          onClick={onSave}
          className="rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? '저장 중…' : '메모 저장'}
        </button>
      </div>
    </>
  )
}

function ModalCloseBtn({ onClose }: { onClose: () => void }) {
  return (
    <button
      type="button"
      onClick={onClose}
      className="rounded-[9px] border border-[#e2e5e9] bg-white px-4 py-2.5 text-[13px] font-[500] text-[#4b5563] transition-colors hover:bg-[#f7f8f9]"
    >
      닫기
    </button>
  )
}
