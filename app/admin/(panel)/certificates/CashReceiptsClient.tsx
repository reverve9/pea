'use client'

import { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import AdminListHeader from '@/components/admin/AdminListHeader'
import AdminModal from '@/components/admin/AdminModal'
import { adminFieldClass, adminSelectClass } from '@/components/admin/AdminToolbar'
import { formatDate } from '@/lib/display'
import type { CashReceiptAdminRow, CashReceiptPurpose } from '@/lib/types'
import { markCashReceiptIssued, markCashReceiptFailed } from './actions'

// 현금영수증 발급현황 — cash_receipts 원장(발급/취소 이벤트). 무통장 입금확인 시 자동 접수라
// 여기선 조회가 주. 다만 팝빌 실연동 전에는 원장이 '발급대기'로만 쌓이므로, 어드민이 홈택스/팝빌에서
// 직접 발급하고 승인번호를 넣어 확정하는 수기 발급처리를 둔다(실연동 후에도 실패건 복구용).
// 유형·상태 필터 + 신청번호/신청자 검색. [[cash-receipt-spec]]

const PURPOSE_LABEL: Record<CashReceiptPurpose, string> = {
  personal: '소득공제',
  business: '지출증빙',
  self: '자진발급',
}

const won = (n: number) => n.toLocaleString('ko-KR') + '원'

export default function CashReceiptsClient({ receipts }: { receipts: CashReceiptAdminRow[] }) {
  const router = useRouter()
  const [busy, startTransition] = useTransition()
  const [purpose, setPurpose] = useState<'all' | CashReceiptPurpose>('all')
  const [status, setStatus] = useState<'all' | 'issue' | 'cancel' | 'waiting'>('all')
  const [query, setQuery] = useState('')
  const [editing, setEditing] = useState<CashReceiptAdminRow | null>(null)

  const q = query.trim().replace(/\s/g, '')
  const rows = useMemo(
    () =>
      receipts.filter((r) => {
        if (purpose !== 'all' && r.purpose !== purpose) return false
        if (status === 'waiting' ? r.status !== 'pending' : status !== 'all' && r.kind !== status) return false
        if (q && !`${r.application_no ?? ''}${r.applicant_name ?? ''}`.replace(/\s/g, '').includes(q)) return false
        return true
      }),
    [receipts, purpose, status, q],
  )
  const issuedCount = rows.filter((r) => r.status === 'issued').length
  const waitingCount = rows.filter((r) => r.status === 'pending').length

  const fail = (id: string) => {
    if (!confirm('발급 실패로 처리할까요? 발급 후 승인번호를 입력하면 다시 완료로 되돌릴 수 있습니다.')) return
    startTransition(async () => {
      const res = await markCashReceiptFailed(id)
      if (res.ok) router.refresh()
      else alert(res.error)
    })
  }

  if (receipts.length === 0) {
    return (
      <div className="rounded-[12px] bg-white px-5 py-16 text-center shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
        <p className="text-[13.5px] font-[400] text-[#6b7280]">발급된 현금영수증이 아직 없습니다.</p>
        <p className="mt-1.5 text-[12px] font-[300] text-[#9ca3af]">
          신청 관리에서 “입금확인”으로 전환하면 해당 건의 현금영수증이 자동 발급되어 여기에 기록됩니다.
        </p>
      </div>
    )
  }

  return (
    <>
      <AdminListHeader
        left={
          <div className="flex flex-wrap items-center gap-2">
            <select className={adminSelectClass} value={purpose} onChange={(e) => setPurpose(e.target.value as typeof purpose)}>
              <option value="all">유형 전체</option>
              <option value="personal">소득공제</option>
              <option value="business">지출증빙</option>
              <option value="self">자진발급</option>
            </select>
            <select className={adminSelectClass} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="all">구분 전체</option>
              <option value="issue">발급</option>
              <option value="cancel">취소발급</option>
              <option value="waiting">발급대기</option>
            </select>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="신청번호 · 신청자 검색"
                className="admin-field w-[180px] rounded-[7px] bg-white py-1.5 pl-7 pr-2.5 text-[12.5px] text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:bg-[#e7eef7]"
              />
            </div>
          </div>
        }
        right={
          <p className="whitespace-nowrap text-[12px] font-[300] text-[#6b7280]">
            내역 <span className="font-[600] tabular-nums text-[#1f2937]">{rows.length}</span>건 ·{' '}
            <span className="font-[500] text-[#0f5a3c]">발급 {issuedCount}건</span>
            {waitingCount > 0 && <span className="ml-1.5 font-[500] text-[#8a4b00]">대기 {waitingCount}건</span>}
          </p>
        }
      />

      <div className="overflow-hidden rounded-[12px] bg-white shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#eceef1] text-[12px] font-[500] text-[#9ca3af]">
              <th className="px-5 py-3">신청번호</th>
              <th className="px-2 py-3">신청자</th>
              <th className="px-2 py-3">유형</th>
              <th className="px-2 py-3 text-right">금액</th>
              <th className="px-2 py-3">승인번호</th>
              <th className="px-2 py-3">상태</th>
              <th className="px-2 py-3 text-right">발급일</th>
              <th className="px-5 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isCancel = r.kind === 'cancel'
              const done = r.status === 'issued'
              return (
                <tr key={r.id} className="border-b border-[#f1f3f5] last:border-0 hover:bg-[#f9fafb]">
                  <td className="px-5 py-3.5 text-[12.5px] font-[500] tabular-nums text-[#374151]">
                    {r.application_no ?? '—'}
                  </td>
                  <td className="px-2 py-3.5 text-[13px] font-[400] text-[#1f2937]">{r.applicant_name ?? '—'}</td>
                  <td className="px-2 py-3.5 text-[12.5px] font-[300] text-[#6b7280]">{PURPOSE_LABEL[r.purpose]}</td>
                  <td className="px-2 py-3.5 text-right text-[12.5px] font-[500] tabular-nums text-[#374151]">
                    {isCancel ? '−' : ''}
                    {won(r.amount)}
                  </td>
                  <td className="px-2 py-3.5 text-[12px] font-[300] tabular-nums text-[#6b7280]">
                    {r.approval_no ?? <span className="text-[#b0b6be]">미발급</span>}
                  </td>
                  <td className="px-2 py-3.5">{statusBadge(r.kind, r.status)}</td>
                  <td className="px-2 py-3.5 text-right text-[11px] font-[300] tabular-nums text-[#9ca3af]">
                    {r.issued_at ? formatDate(r.issued_at.slice(0, 10)) : '—'}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="inline-flex items-center gap-3">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => setEditing(r)}
                        className={`text-[13px] hover:underline disabled:opacity-40 ${
                          done ? 'font-[400] text-[#6b7280]' : 'font-[500] text-[#3f6a99]'
                        }`}
                      >
                        {done ? '승인번호 수정' : '발급처리'}
                      </button>
                      {r.status === 'pending' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => fail(r.id)}
                          className="text-[13px] font-[400] text-[#8f3a2a] hover:underline disabled:opacity-40"
                        >
                          실패
                        </button>
                      )}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {editing && (
        <IssueModal
          receipt={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null)
            router.refresh()
          }}
        />
      )}
    </>
  )
}

// 상태 배지 — 발급 pending(발급대기)/issued(발급완료)/failed(실패). 취소발급은 kind로 갈라 별도 표기.
function statusBadge(kind: CashReceiptAdminRow['kind'], status: CashReceiptAdminRow['status']) {
  if (kind === 'cancel') {
    if (status === 'pending') return <Badge color="amber" size="sm">취소대기</Badge>
    if (status === 'failed') return <Badge color="gray" size="sm">취소실패</Badge>
    return <Badge color="slate" size="sm">취소발급</Badge>
  }
  if (status === 'issued') return <Badge color="emerald" size="sm">발급완료</Badge>
  if (status === 'failed') return <Badge color="gray" size="sm">실패</Badge>
  if (status === 'cancelled') return <Badge color="slate" size="sm">취소됨</Badge>
  return <Badge color="amber" size="sm">발급대기</Badge>
}

// 수기 발급처리 모달 — 홈택스/팝빌에서 발급한 승인번호를 입력해 원장을 확정.
function IssueModal({
  receipt,
  onClose,
  onSaved,
}: {
  receipt: CashReceiptAdminRow
  onClose: () => void
  onSaved: () => void
}) {
  const [busy, startTransition] = useTransition()
  const [no, setNo] = useState(receipt.approval_no ?? '')
  const isCancel = receipt.kind === 'cancel'
  const done = receipt.status === 'issued'
  const valid = no.trim().length >= 4

  const save = () => {
    if (!valid) return
    startTransition(async () => {
      const res = await markCashReceiptIssued(receipt.id, no)
      if (res.ok) onSaved()
      else alert(res.error)
    })
  }

  return (
    <AdminModal title={done ? '승인번호 수정' : isCancel ? '취소발급 처리' : '현금영수증 발급처리'} onClose={onClose} maxWidth={440}>
      <p className="mb-4 text-[12.5px] font-[300] leading-relaxed text-[#6b7280]">
        {isCancel
          ? '홈택스·팝빌에서 아래 내역의 취소발급을 진행한 뒤, 취소 승인번호를 입력하면 완료로 확정됩니다.'
          : '홈택스·팝빌에서 아래 식별번호로 발급한 뒤, 승인번호를 입력하면 발급완료로 확정됩니다.'}
      </p>

      <dl className="rounded-[10px] bg-[#f5f7fa] px-4 py-3 text-[12.5px]">
        {[
          ['신청번호', receipt.application_no ?? '—'],
          ['신청자', receipt.applicant_name ?? '—'],
          ['발급유형', PURPOSE_LABEL[receipt.purpose]],
          ['식별번호', receipt.identifier],
          [isCancel ? '취소금액' : '발급금액', (isCancel ? '−' : '') + won(receipt.amount)],
        ].map(([k, v]) => (
          <div key={k} className="flex items-baseline justify-between py-1">
            <dt className="font-[300] text-[#6b7280]">{k}</dt>
            <dd className="font-[500] tabular-nums text-[#374151]">{v}</dd>
          </div>
        ))}
      </dl>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12.5px] font-[500] text-[#374151]">
          {isCancel ? '취소 승인번호' : '승인번호'}
        </span>
        <input
          autoFocus
          value={no}
          onChange={(e) => setNo(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && save()}
          placeholder="국세청 승인번호"
          className={`${adminFieldClass} w-full bg-[#f5f7fa] py-2 text-[13px] tabular-nums placeholder:text-[#b0b6be]`}
        />
      </label>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[9px] bg-[#eef1f4] px-4 py-2.5 text-[13px] font-[500] text-[#4b5563] transition-colors hover:bg-[#e4e8ec]"
        >
          취소
        </button>
        <button
          type="button"
          disabled={busy || !valid}
          onClick={save}
          className="rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-colors hover:bg-[#16304f] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? '처리 중…' : done ? '승인번호 저장' : '발급 확정'}
        </button>
      </div>
    </AdminModal>
  )
}
