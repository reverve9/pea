'use client'

import React, { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Badge } from '@/components/common/Badge'
import { formatDate } from '@/lib/display'
import type { CertificateRosterRow } from '@/lib/types'
import { issueCertificate, revokeCertificate } from './actions'

// 증명서 발급현황 — 연수완료 참가자 명단(수료증). 차수 필터 + 참가자별 발급/발급취소.
export default function CertificatesClient({ roster }: { roster: CertificateRosterRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [filter, setFilter] = useState<string>('all')

  // 차수(session_label) 목록 — 필터 드롭다운.
  const sessions = useMemo(() => {
    const set = new Set(roster.map((r) => r.session_label))
    return Array.from(set)
  }, [roster])

  const rows = filter === 'all' ? roster : roster.filter((r) => r.session_label === filter)
  const issuedCount = rows.filter((r) => r.issued).length

  const run = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) router.refresh()
      else alert(res.error)
    })
  }

  if (roster.length === 0) {
    return (
      <div className="rounded-[12px] border border-[#eceef1] bg-white px-5 py-16 text-center">
        <p className="text-[13.5px] font-[400] text-[#6b7280]">연수완료 처리된 신청이 아직 없습니다.</p>
        <p className="mt-1.5 text-[12px] font-[300] text-[#9ca3af]">
          신청 관리에서 상태를 “연수완료”로 바꾸면 해당 참가자가 발급 대상으로 나타납니다.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[12.5px] font-[500] text-[#4b5563]">차수</label>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-[8px] bg-[#eef2f6] px-3 py-1.5 text-[13px] text-[#1f2937] outline-none focus:bg-[#e3e9ef]"
          >
            <option value="all">전체</option>
            {sessions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <p className="text-[13px] font-[300] text-[#6b7280]">
          대상 {rows.length}명 · <span className="font-[500] text-[#0f5a3c]">발급 {issuedCount}명</span>
        </p>
      </div>

      <div className="overflow-hidden rounded-[12px] border border-[#eceef1] bg-white">
        <table className="w-full text-left">
          <thead>
            <tr className="border-b border-[#eceef1] text-[12px] font-[500] text-[#9ca3af]">
              <th className="px-5 py-3">이름</th>
              <th className="px-2 py-3">차수</th>
              <th className="px-2 py-3">신청번호</th>
              <th className="px-2 py-3">종류</th>
              <th className="px-2 py-3">상태</th>
              <th className="px-5 py-3 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.participant_id} className="border-b border-[#f1f3f5] last:border-0 hover:bg-[#f9fafb]">
                <td className="px-5 py-3.5 text-[13px] font-[400] text-[#1f2937]">
                  {r.participant_name}
                  {r.is_leader && <span className="ml-1 text-[10.5px] text-[#3f6a99]">대표</span>}
                </td>
                <td className="px-2 py-3.5 text-[12.5px] font-[300] text-[#6b7280]">{r.session_label}</td>
                <td className="px-2 py-3.5 text-[12.5px] font-[500] tabular-nums text-[#374151]">
                  {r.application_no}
                </td>
                <td className="px-2 py-3.5 text-[12.5px] font-[300] text-[#6b7280]">수료증</td>
                <td className="px-2 py-3.5">
                  {r.issued ? (
                    <span className="inline-flex items-center gap-1.5">
                      <Badge color="emerald" size="sm">
                        발급완료
                      </Badge>
                      {r.issued_at && (
                        <span className="text-[11px] font-[300] tabular-nums text-[#9ca3af]">
                          {formatDate(r.issued_at.slice(0, 10))}
                        </span>
                      )}
                    </span>
                  ) : (
                    <Badge color="amber" size="sm">
                      대기
                    </Badge>
                  )}
                </td>
                <td className="px-5 py-3.5 text-right">
                  {r.issued ? (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (!confirm('발급을 취소할까요? 발급 기록이 삭제됩니다.')) return
                        run(() => revokeCertificate(r.certificate_id!))
                      }}
                      className="text-[13px] font-[400] text-[#8f3a2a] hover:underline disabled:opacity-40"
                    >
                      발급취소
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => run(() => issueCertificate(r.participant_id))}
                      className="text-[13px] font-[500] text-[#3f6a99] hover:underline disabled:opacity-40"
                    >
                      발급
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}
