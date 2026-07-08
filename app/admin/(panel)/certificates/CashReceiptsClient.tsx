'use client'

import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import AdminListHeader from '@/components/admin/AdminListHeader'
import { adminSelectClass } from '@/components/admin/AdminToolbar'
import { formatDate } from '@/lib/display'
import type { CashReceiptAdminRow, CashReceiptPurpose } from '@/lib/types'

// 현금영수증 발급현황 — cash_receipts 원장(발급/취소 이벤트). 무통장 입금확인 시 자동발급이라
// 여기선 조회가 주(수동 발급 버튼 없음). 유형·상태 필터 + 신청번호/신청자 검색. [[cash-receipt-spec]]

const PURPOSE_LABEL: Record<CashReceiptPurpose, string> = {
  personal: '소득공제',
  business: '지출증빙',
  self: '자진발급',
}

const won = (n: number) => n.toLocaleString('ko-KR') + '원'

export default function CashReceiptsClient({ receipts }: { receipts: CashReceiptAdminRow[] }) {
  const [purpose, setPurpose] = useState<'all' | CashReceiptPurpose>('all')
  const [status, setStatus] = useState<'all' | 'issue' | 'cancel'>('all')
  const [query, setQuery] = useState('')

  const q = query.trim().replace(/\s/g, '')
  const rows = useMemo(
    () =>
      receipts.filter((r) => {
        if (purpose !== 'all' && r.purpose !== purpose) return false
        if (status !== 'all' && r.kind !== status) return false
        if (q && !`${r.application_no ?? ''}${r.applicant_name ?? ''}`.replace(/\s/g, '').includes(q)) return false
        return true
      }),
    [receipts, purpose, status, q],
  )
  const issuedCount = rows.filter((r) => r.kind === 'issue').length

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
              <th className="px-5 py-3 text-right">발급일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const isCancel = r.kind === 'cancel'
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
                  <td className="px-5 py-3.5 text-right text-[11px] font-[300] tabular-nums text-[#9ca3af]">
                    {formatDate((r.issued_at ?? r.created_at).slice(0, 10))}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

// 상태 배지 — 취소발급은 별도 표기. 발급은 pending(발급대기)/issued(발급완료)/failed(실패)/cancelled(취소됨).
function statusBadge(kind: CashReceiptAdminRow['kind'], status: CashReceiptAdminRow['status']) {
  if (kind === 'cancel') return <Badge color="slate" size="sm">취소발급</Badge>
  if (status === 'issued') return <Badge color="emerald" size="sm">발급완료</Badge>
  if (status === 'failed') return <Badge color="gray" size="sm">실패</Badge>
  if (status === 'cancelled') return <Badge color="slate" size="sm">취소됨</Badge>
  return <Badge color="amber" size="sm">발급대기</Badge>
}
