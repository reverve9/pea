'use client'

import React, { useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import AdminListHeader from '@/components/admin/AdminListHeader'
import { adminSelectClass } from '@/components/admin/AdminToolbar'
import { formatDate } from '@/lib/display'
import type { CertificateRosterRow } from '@/lib/types'
import { issueCertificate, revokeCertificate } from './actions'

// 증명서 발급현황 — 연수완료 참가자 명단(수료증). 차수 필터 + 참가자별 발급/발급취소.
export default function CertificatesClient({ roster }: { roster: CertificateRosterRow[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  // 필터 — 신청관리와 동일: 유형 · 회차 · 상태 · 이름/연락처 검색(실시간).
  const [kind, setKind] = useState<'all' | 'jikmu' | 'jayul'>('all')
  const [session, setSession] = useState('all')
  const [status, setStatus] = useState<'all' | 'issued' | 'pending'>('all')
  const [query, setQuery] = useState('')

  // 차수(session_label) 목록 — 필터 드롭다운.
  const sessions = useMemo(() => Array.from(new Set(roster.map((r) => r.session_label))), [roster])

  const q = query.trim().replace(/\s/g, '')
  const rows = roster.filter((r) => {
    if (kind !== 'all' && r.kind !== kind) return false
    if (session !== 'all' && r.session_label !== session) return false
    if (status === 'issued' && !r.issued) return false
    if (status === 'pending' && r.issued) return false
    if (q && !`${r.participant_name}${r.phone}`.replace(/\s/g, '').includes(q)) return false
    return true
  })
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
      <div className="rounded-[12px] bg-white px-5 py-16 text-center shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
        <p className="text-[13.5px] font-[400] text-[#6b7280]">연수완료 처리된 신청이 아직 없습니다.</p>
        <p className="mt-1.5 text-[12px] font-[300] text-[#9ca3af]">
          신청 관리에서 상태를 “연수완료”로 바꾸면 해당 참가자가 발급 대상으로 나타납니다.
        </p>
      </div>
    )
  }

  return (
    <>
      <AdminListHeader
        left={
          <div className="flex flex-wrap items-center gap-2">
            <select className={adminSelectClass} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
              <option value="all">유형 전체</option>
              <option value="jikmu">직무연수</option>
              <option value="jayul">자율패키지</option>
            </select>
            <select className={adminSelectClass} value={session} onChange={(e) => setSession(e.target.value)}>
              <option value="all">회차 전체</option>
              {sessions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <select className={adminSelectClass} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="all">상태 전체</option>
              <option value="issued">발급완료</option>
              <option value="pending">미발급</option>
            </select>
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="이름 · 연락처 검색"
                className="admin-field w-[180px] rounded-[7px] bg-white py-1.5 pl-7 pr-2.5 text-[12.5px] text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:bg-[#e7eef7]"
              />
            </div>
          </div>
        }
        right={
          <p className="whitespace-nowrap text-[12px] font-[300] text-[#6b7280]">
            대상 <span className="font-[600] tabular-nums text-[#1f2937]">{rows.length}</span>명 ·{' '}
            <span className="font-[500] text-[#0f5a3c]">발급 {issuedCount}명</span>
          </p>
        }
      />

      <div className="overflow-hidden rounded-[12px] bg-white shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
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
