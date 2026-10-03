'use client'

import React, { useCallback, useEffect, useState } from 'react'
import { Badge, type BadgeColor } from '@/components/common/Badge'
import type { ApplicationAdmin } from '@/lib/types'
import {
  listSmsForApplication,
  listSmsAttention,
  resendSms,
  checkSms,
  resolveSms,
  type SmsRowView,
  type SmsViewStatus,
} from './smsActions'

// 문자(솔라피) 발송 이력 — 신청 상세 하단 + 신청관리 상단 '확인 필요' 안내. 기존 화면 구성은 그대로 두고 덧붙이기만 한다.

const KIND_LABEL: Record<SmsRowView['kind'], string> = {
  deposit_notice: '접수완료·입금안내',
  waitlist_notice: '예비접수 안내',
  deposit_initial: '입금확인',
  due_notice: '추가입금 안내',
  deposit_additional: '추가입금 확인',
  refund_received: '환불접수',
  refund_completed: '환불완료',
  auto_cancelled: '자동취소',
  event_reminder: '행사 1주일 전 안내',
}
const STATUS_VIEW: Record<SmsViewStatus, { label: string; color: BadgeColor }> = {
  sent: { label: '발송', color: 'emerald' },
  sending: { label: '발송 중', color: 'slate' },
  stale: { label: '결과 확인 필요', color: 'amber' },
  unknown: { label: '결과 확인 필요', color: 'amber' },
  failed: { label: '실패', color: 'terracotta' },
  held: { label: '보류(미발송)', color: 'slate' },
}

const fmt = (iso: string) => {
  const d = new Date(new Date(iso).getTime() + 9 * 3600 * 1000)
  const p = (v: number) => String(v).padStart(2, '0')
  return `${p(d.getUTCMonth() + 1)}/${p(d.getUTCDate())} ${p(d.getUTCHours())}:${p(d.getUTCMinutes())}`
}

export function SmsHistory({ applicationId }: { applicationId: string }) {
  const [rows, setRows] = useState<SmsRowView[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await listSmsForApplication(applicationId)
    if (!res.ok) return setError(res.error)
    setError(null)
    setRows(res.unavailable ? null : res.rows)
  }, [applicationId])

  useEffect(() => {
    void load()
  }, [load])

  const act = async (id: string, fn: () => Promise<{ ok: boolean; message?: string; error?: string }>) => {
    setBusy(id)
    try {
      const res = await fn()
      alert(res.ok ? res.message : res.error)
    } finally {
      setBusy(null)
      await load()
    }
  }

  if (error) return <p className="mt-4 text-[11.5px] font-[300] text-[#a06a1a]">{error}</p>
  if (!rows || rows.length === 0) return null

  return (
    <div className="mt-4">
      <p className="mb-2 text-[12.5px] font-[500] text-[#8a94a0]">문자 발송</p>
      {rows.map((r) => {
        const st = STATUS_VIEW[r.status]
        const canResend = (r.status === 'failed' || r.status === 'held') && !r.incomplete
        const canCheck = r.status === 'unknown' || r.status === 'stale' || r.status === 'sent'
        const canResolve = r.status === 'unknown' || r.status === 'stale'
        return (
          <div key={r.id} className="mb-2 rounded-[9px] bg-[#f4f6f8] px-3 py-2 text-[12px]">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <Badge color={st.color} size="sm">{st.label}</Badge>
              <span className="font-[500] text-[#4b5563]">{KIND_LABEL[r.kind]}</span>
              <span className="font-[300] tabular-nums text-[#6b7280]">
                {r.msg_type} · {r.recipient} · {fmt(r.sent_at ?? r.created_at)}
                {r.attempts > 1 && ` · 시도 ${r.attempts}회`}
              </span>
              <span className="ml-auto flex gap-2">
                <button type="button" onClick={() => setOpenId((v) => (v === r.id ? null : r.id))} className="text-[11.5px] font-[400] text-[#6b7280] underline-offset-2 hover:underline">
                  {openId === r.id ? '문안 닫기' : '문안'}
                </button>
                {canCheck && (
                  <button type="button" disabled={busy === r.id} onClick={() => act(r.id, () => checkSms(r.id))} className="text-[11.5px] font-[400] text-[#3f6a99] underline-offset-2 hover:underline disabled:opacity-40">
                    결과 조회
                  </button>
                )}
                {canResolve && (
                  <>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => {
                        if (!confirm('솔라피 발송내역에서 이 문자가 발송된 것을 확인했습니까? "발송"으로 표시합니다.')) return
                        void act(r.id, () => resolveSms(r.id, 'sent'))
                      }}
                      className="text-[11.5px] font-[400] text-[#3f6a99] underline-offset-2 hover:underline disabled:opacity-40"
                    >
                      발송 확인
                    </button>
                    <button
                      type="button"
                      disabled={busy === r.id}
                      onClick={() => {
                        if (!confirm('솔라피 발송내역에 이 문자가 없는 것을 확인했습니까? "미발송"으로 표시하면 재발송할 수 있습니다.')) return
                        void act(r.id, () => resolveSms(r.id, 'failed'))
                      }}
                      className="text-[11.5px] font-[400] text-[#a86a5c] underline-offset-2 hover:underline disabled:opacity-40"
                    >
                      미발송 확인
                    </button>
                  </>
                )}
                {canResend && (
                  <button
                    type="button"
                    disabled={busy === r.id}
                    onClick={() => {
                      if (!confirm(`${KIND_LABEL[r.kind]} 문자를 ${r.recipient} 로 재발송할까요? (저장된 문안 그대로)`)) return
                      void act(r.id, () => resendSms(r.id))
                    }}
                    className="text-[11.5px] font-[500] text-[#1e3a5f] underline-offset-2 hover:underline disabled:opacity-40"
                  >
                    재발송
                  </button>
                )}
              </span>
            </div>
            {r.error && r.status !== 'sent' && <p className="mt-1 text-[11.5px] font-[300] text-[#a06a1a]">{r.error}</p>}
            {openId === r.id && (
              <pre className="mt-1.5 whitespace-pre-wrap rounded-[7px] bg-white px-2.5 py-2 font-sans text-[12px] font-[300] text-[#374151]">{r.body}</pre>
            )}
          </div>
        )
      })}
    </div>
  )
}

// 신청관리 상단 — 문자 실패·보류·결과 불명확 건이 있을 때만 노출. 신청번호를 누르면 상세(문자 이력)로.
export function SmsAttentionBanner({
  applications,
  onOpen,
}: {
  applications: ApplicationAdmin[]
  onOpen: (a: ApplicationAdmin) => void
}) {
  const [rows, setRows] = useState<SmsRowView[]>([])
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const res = await listSmsAttention()
      if (!cancelled && res.ok) setRows(res.rows)
    })()
    return () => {
      cancelled = true
    }
  }, [applications])

  const byApp = new Map<string, ApplicationAdmin>(applications.map((a) => [a.id, a]))
  const targets = [...new Set(rows.map((r) => r.application_id).filter((v): v is string => !!v))]
    .map((id) => byApp.get(id))
    .filter((a): a is ApplicationAdmin => !!a)
  if (targets.length === 0) return null

  return (
    <div className="mb-3 ml-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-[8px] bg-[#f3f6f9] px-3.5 py-2.5 text-[12.5px]">
      <Badge color="terracotta" size="sm">문자 확인 필요</Badge>
      <span className="text-[14px] font-[700] tabular-nums text-[#1e3a5f]">{rows.length}건</span>
      <span className="font-[400] text-[#4b5563]">실패 · 보류 · 결과 확인 필요</span>
      <span className="flex flex-wrap gap-1.5">
        {targets.slice(0, 8).map((a) => (
          <button
            key={a.id}
            type="button"
            onClick={() => onOpen(a)}
            className="rounded-[7px] bg-[#1e3a5f]/[0.08] px-2 py-0.5 text-[11.5px] font-[500] tabular-nums text-[#1e3a5f] hover:bg-[#1e3a5f]/[0.14]"
          >
            {a.application_no}
          </button>
        ))}
        {targets.length > 8 && <span className="text-[11.5px] text-[#6b7280]">외 {targets.length - 8}건</span>}
      </span>
    </div>
  )
}
