'use client'

import React, { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ChevronRight, Link2, Search } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import AdminModal from '@/components/admin/AdminModal'
import AdminList, { type AdminListColumn } from '@/components/admin/AdminList'
import { formatDate, formatKRW, APPLICATION_STATUS } from '@/lib/display'
import { lessonLevelLabel, equipmentLabel, JAYUL_LESSONS, EQUIPMENT_TYPES } from '@/lib/lessonOptions'
import { APPAREL_SIZES, GEAR_SIZES } from '@/lib/rentalOptions'
import { PROGRAMS } from '@/lib/programs'
import type { ParticipantDetailInput } from '@/lib/participantDetail'
import type { ApplicationAdmin, ApplicationStatus, InsuranceRosterEntry, ParticipantAdmin } from '@/lib/types'
import {
  setApplicationStatus,
  setApplicationWaitlist,
  releasePaymentClaim,
  saveAdminMemo,
  revealInsuranceRoster,
  updateParticipantDetail,
  issueFillLink,
} from './actions'

// 정상 생애주기(순방향 진행) vs 예외/종료(오프램프) — 같은 층위 아님.
const LIFECYCLE: ApplicationStatus[] = ['pending', 'paid', 'completed']
const EXCEPTIONS: ApplicationStatus[] = ['cancelled', 'refunded']

// 프로그램 필터 = 전체 + 신청페이지와 동일 프로그램(종목). 유형/상태는 셀렉트.
const PROGRAM_OPTIONS = [{ key: 'all', label: '전체' }, ...PROGRAMS.map((p) => ({ key: p.key, label: p.title }))]
const KIND_OPTIONS: { key: 'all' | 'jikmu' | 'jayul'; label: string }[] = [
  { key: 'all', label: '유형 전체' },
  { key: 'jikmu', label: '직무연수' },
  { key: 'jayul', label: '자율패키지' },
]
const STATUS_OPTIONS: { key: 'all' | ApplicationStatus; label: string }[] = [
  { key: 'all', label: '상태 전체' },
  { key: 'pending', label: '입금대기' },
  { key: 'paid', label: '입금확인' },
  { key: 'completed', label: '연수완료' },
  { key: 'cancelled', label: '취소' },
  { key: 'refunded', label: '환불완료' },
]

// 배정 필터 — 정원 내(배정) vs 정원 초과(예비). '입금대기' 상태와 용어 혼동 피하려 '대기'→'예비'.
type AssignFilter = 'all' | 'in' | 'wait'
const ASSIGN_OPTIONS: { key: AssignFilter; label: string }[] = [
  { key: 'all', label: '배정 전체' },
  { key: 'in', label: '정원' },
  { key: 'wait', label: '예비' },
]

// 예비(정원초과) 배지 — 상태 배지(soft tint pill)와 확실히 구분. 예외·주의 성격이라 solid 채움 + 경고 아이콘 + 백색 텍스트.
function WaitlistBadge() {
  return (
    <span className="inline-flex items-center gap-1 rounded-[4px] bg-[#d97116] px-2 py-0.5 text-[11px] font-[600] leading-none text-white">
      <AlertTriangle size={11} strokeWidth={2.4} /> 예비
    </span>
  )
}

export default function ApplicationsClient({ applications }: { applications: ApplicationAdmin[] }) {
  const router = useRouter()
  const [detail, setDetail] = useState<ApplicationAdmin | null>(null)

  // 필터 상태 — 프로그램(종목)·유형·상태·검색(이름/연락처, 실시간)
  const [program, setProgram] = useState('all')
  const [kind, setKind] = useState<'all' | 'jikmu' | 'jayul'>('all')
  const [status, setStatus] = useState<'all' | ApplicationStatus>('all')
  const [assign, setAssign] = useState<AssignFilter>('all')
  const [query, setQuery] = useState('')

  const activeProgram = PROGRAMS.find((p) => p.key === program)
  const q = query.trim().replace(/\s/g, '')
  const filterActive = program !== 'all' || kind !== 'all' || status !== 'all' || assign !== 'all' || q !== ''
  const filtered = applications.filter((a) => {
    if (activeProgram && a.program_sport !== activeProgram.sport) return false
    if (kind !== 'all' && a.kind !== kind) return false
    if (status !== 'all' && a.status !== status) return false
    if (assign === 'wait' && !a.is_waitlisted) return false
    if (assign === 'in' && a.is_waitlisted) return false
    if (q) {
      const hay = `${a.applicant_name}${a.phone}`.replace(/\s/g, '')
      if (!hay.includes(q)) return false
    }
    return true
  })

  const reviewCount = applications.filter((a) => a.needs_review).length

  const columns: AdminListColumn<ApplicationAdmin>[] = [
    {
      key: 'no',
      header: '신청번호',
      thClassName: 'px-2',
      tdClassName: 'px-2 text-[12.5px] font-[500] tabular-nums text-[#1f2937]',
      cell: (a) => a.application_no,
    },
    {
      key: 'name',
      header: '신청자',
      tdClassName: 'px-2 text-[13px] font-[400] text-[#374151]',
      cell: (a) => (
        <>
          {a.applicant_name}
          {a.headcount > 1 && <span className="ml-1 text-[11.5px] text-[#9ca3af]">외 {a.headcount - 1}</span>}
        </>
      ),
    },
    {
      key: 'phone',
      header: '연락처',
      tdClassName: 'px-2 text-[12.5px] font-[300] tabular-nums text-[#6b7280]',
      cell: (a) => a.phone,
    },
    {
      key: 'type',
      header: '유형',
      tdClassName: 'px-2 text-[12.5px] font-[300] text-[#6b7280]',
      cell: (a) => a.track_label,
    },
    {
      key: 'session',
      header: '회차 · 일정',
      tdClassName: 'px-2',
      cell: (a) => (
        <div className="leading-tight">
          <div className="text-[12.5px] font-[400] text-[#374151]">{a.session_label || '—'}</div>
          {a.period && (
            <div className="mt-0.5 text-[11.5px] font-[300] tabular-nums text-[#9ca3af]">{a.period}</div>
          )}
        </div>
      ),
    },
    {
      key: 'amount',
      header: '금액',
      align: 'right',
      tdClassName: 'px-2 text-[12.5px] font-[400] tabular-nums text-[#374151]',
      cell: (a) => formatKRW(a.total_amount),
    },
    {
      key: 'status',
      header: '상태',
      cell: (a) => (
        <Badge color={APPLICATION_STATUS[a.status].color} size="sm">
          {APPLICATION_STATUS[a.status].label}
        </Badge>
      ),
    },
    {
      key: 'assign',
      header: '배정',
      cell: (a) =>
        a.is_waitlisted ? (
          <WaitlistBadge />
        ) : (
          <span className="text-[12px] font-[300] text-[#9ca3af]">정원</span>
        ),
    },
    {
      key: 'claim',
      header: '입금확인요청',
      cell: (a) =>
        a.needs_review ? (
          <span className="inline-flex items-center gap-1">
            <Badge color="amber" size="sm">
              확인요청
            </Badge>
            {a.payer_mismatch && (
              <AlertTriangle size={13} className="text-[#c0392b]" aria-label="입금자명 불일치" />
            )}
          </span>
        ) : (
          <span className="text-[12px] text-[#d1d5db]">—</span>
        ),
    },
    {
      key: 'manage',
      header: '관리',
      align: 'right',
      thClassName: 'px-5',
      tdClassName: 'px-5',
      cell: (a) => (
        <button
          type="button"
          onClick={() => setDetail(a)}
          className="text-[13px] font-[400] text-[#3f6a99] hover:underline"
        >
          상세
        </button>
      ),
    },
  ]

  // 선택·입력 = 배경 틴트만(테두리 없음). 흰 채움으로 틴트 박스와 구분.
  const selectClass =
    'rounded-[7px] bg-white px-2.5 py-1.5 text-[12.5px] font-[400] text-[#374151] outline-none focus:bg-[#e7eef7]'

  // 프로그램(종목) 탭 — 박스 밖(위). 여백 없이 붙은 라운드 없는 사각 탭. 활성=네이비 채움/비활성=흰 채움.
  const programTabs = (
    <div className="mb-3 flex w-fit overflow-hidden">
      {PROGRAM_OPTIONS.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => setProgram(o.key)}
          className={`px-4 py-2 text-[12.5px] font-[500] transition-colors ${
            program === o.key ? 'bg-[#1e3a5f] text-white' : 'bg-white text-[#4b5563] hover:bg-[#e3e9ef]'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {/* 유형 · 상태 · 검색(실시간) */}
      <select className={selectClass} value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
          {KIND_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <select className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
          {STATUS_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <select className={selectClass} value={assign} onChange={(e) => setAssign(e.target.value as AssignFilter)}>
          {ASSIGN_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름 · 연락처 검색"
            className="w-[180px] rounded-[7px] bg-white py-1.5 pl-7 pr-2.5 text-[12.5px] text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:bg-[#e7eef7]"
          />
        </div>
      </div>
  )

  const emptyLabel =
    activeProgram && !activeProgram.ready
      ? `${activeProgram.title} 연수는 준비 중입니다.`
      : '조건에 맞는 신청이 없습니다.'

  return (
    <>
      {reviewCount > 0 && (
        <p className="mb-3 text-[13px] font-[400] text-[#8a4b00]">
          입금 확인요청 {reviewCount}건 — 통장 대조 후 처리해 주세요.
        </p>
      )}

      {programTabs}

      <AdminList
        items={filtered}
        columns={columns}
        getRowKey={(a) => a.id}
        toolbar={toolbar}
        emptyLabel={emptyLabel}
        rowClassName={(a) => (a.needs_review ? 'bg-[#fffaf0]' : '')}
        resetKey={`${program}|${kind}|${status}|${assign}|${q}`}
        total={applications.length}
        filterActive={filterActive}
      />

      {detail && (
        <DetailModal
          app={detail}
          onClose={() => setDetail(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </>
  )
}

// ── 상세 모달 ──
function DetailModal({
  app,
  onClose,
  onChanged,
}: {
  app: ApplicationAdmin
  onClose: () => void
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [memo, setMemo] = useState(app.admin_memo ?? '')
  const [roster, setRoster] = useState<InsuranceRosterEntry[] | null>(null)
  const [editingPart, setEditingPart] = useState<ParticipantAdmin | null>(null)
  const [copiedFillId, setCopiedFillId] = useState<string | null>(null)
  const [fillBusyId, setFillBusyId] = useState<string | null>(null)

  // 셀프필 링크 발급·복사(참가자별 개별) — 각 링크는 본인 슬롯만 수정 가능. 관리자가 해당 참가자에게 전달.
  const copyFillLink = async (participantId: string) => {
    setFillBusyId(participantId)
    const res = await issueFillLink(app.id, participantId)
    if (!res.ok) {
      alert(res.error)
      setFillBusyId(null)
      return
    }
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/fill/${res.fillToken}`)
      setCopiedFillId(participantId)
      setTimeout(() => setCopiedFillId((c) => (c === participantId ? null : c)), 2500)
    } catch {
      alert('클립보드 복사에 실패했습니다.')
    } finally {
      setFillBusyId((b) => (b === participantId ? null : b))
    }
  }

  const runAndRefresh = (fn: () => Promise<{ ok: boolean; error?: string }>) => {
    startTransition(async () => {
      const res = await fn()
      if (res.ok) {
        onClose()
        onChanged()
      } else {
        alert(res.error)
      }
    })
  }

  const insuranceCount = app.participants.filter((p) => p.has_insurance).length

  // 어드민은 보험 뒷자리를 항상 표시 — 모달 열릴 때 자동 복호(별도 표시 버튼 없음).
  useEffect(() => {
    if (insuranceCount === 0) return
    let cancelled = false
    ;(async () => {
      const res = await revealInsuranceRoster(app.id)
      if (!cancelled && res.ok) setRoster(res.roster)
    })()
    return () => {
      cancelled = true
    }
  }, [app.id, insuranceCount])

  return (
    <>
    <AdminModal title={`신청 상세 · ${app.application_no}`} onClose={onClose} maxWidth={680}>
      {/* 요약 */}
      <div className="rounded-[10px] bg-[#f3f6f9] p-4">
        <div className="flex items-center gap-2">
          <Badge color={APPLICATION_STATUS[app.status].color} size="sm">
            {APPLICATION_STATUS[app.status].label}
          </Badge>
          {app.is_waitlisted && <WaitlistBadge />}
          <span className="text-[12.5px] font-[300] text-[#6b7280]">{app.track_label}</span>
        </div>
        <p className="mt-2 text-[13px] font-[300] text-[#374151]">
          {app.period && <>{app.period} · </>}
          신청일 {formatDate(app.created_at.slice(0, 10))}
        </p>
        <p className="mt-1 text-[14px] font-[500] text-[#1f2937]">
          {app.applicant_name} · <span className="tabular-nums font-[300]">{app.phone}</span>
        </p>
        <p className="mt-1 text-[13px] font-[400] tabular-nums text-[#1f2937]">
          결제금액 {formatKRW(app.total_amount)}
        </p>
      </div>

      {/* 소프트 정원 예비 — 정원 초과 접수분. 승인=정원 편입 / 거절=취소 */}
      {app.is_waitlisted && (
        <div className="mt-3 rounded-[10px] border border-[#f0d9a8] bg-[#fffaf0] p-4">
          <p className="text-[12px] font-[500] text-[#8a4b00]">정원 초과 · 예비</p>
          <p className="mt-1.5 text-[13px] font-[300] text-[#374151]">
            회차 정원을 초과해 예비로 접수된 신청입니다. 승인 시 정원에 편입되고, 거절 시 취소 처리됩니다.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm('이 대기 건을 승인해 정원에 편입할까요?')) return
                runAndRefresh(() => setApplicationWaitlist(app.id, false))
              }}
              className="rounded-[8px] bg-[#1e3a5f] px-3.5 py-2 text-[12.5px] font-[500] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              승인 → 정원 편입
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm('이 대기 건을 거절(취소)할까요? 되돌리기 어려운 처리입니다.')) return
                runAndRefresh(() => setApplicationStatus(app.id, 'cancelled'))
              }}
              className="rounded-[8px] border border-[#e2c9c3] bg-white px-3.5 py-2 text-[12.5px] font-[500] text-[#8f3a2a] transition-colors hover:bg-[#fbf3f1] disabled:opacity-40"
            >
              거절 (취소)
            </button>
          </div>
        </div>
      )}

      {/* 입금 확인요청 대조 */}
      {app.payment_claimed_at && (
        <div className="mt-3 rounded-[10px] border border-[#f0d9a8] bg-[#fffaf0] p-4">
          <p className="text-[12px] font-[500] text-[#8a4b00]">입금 확인요청</p>
          <p className="mt-1.5 text-[13px] font-[300] text-[#374151]">
            요청시각 {formatDate(app.payment_claimed_at.slice(0, 10))}
          </p>
          <p className="mt-1 text-[13px] font-[300] text-[#374151]">
            입금자명{' '}
            <span className={`font-[500] ${app.payer_mismatch ? 'text-[#c0392b]' : 'text-[#1f2937]'}`}>
              {app.payment_claim_name ?? '(미입력)'}
            </span>
            {app.payer_mismatch && (
              <span className="ml-1.5 inline-flex items-center gap-1 text-[11.5px] font-[400] text-[#c0392b]">
                <AlertTriangle size={12} /> 신청자명({app.applicant_name})과 다름 — 통장 대조 확인
              </span>
            )}
          </p>
          <div className="mt-3 flex gap-2">
            {app.status === 'pending' && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm('통장에서 입금을 확인했습니까? 상태를 "입금확인"으로 바꿉니다.')) return
                  runAndRefresh(() => setApplicationStatus(app.id, 'paid'))
                }}
                className="rounded-[8px] bg-[#1e3a5f] px-3.5 py-2 text-[12.5px] font-[500] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
              >
                입금 확인 → 입금확인 처리
              </button>
            )}
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm('입금 확인요청을 해제할까요? 신청자가 다시 요청할 수 있게 됩니다.')) return
                runAndRefresh(() => releasePaymentClaim(app.id))
              }}
              className="rounded-[8px] border border-[#e2c9c3] bg-white px-3.5 py-2 text-[12.5px] font-[500] text-[#8f3a2a] transition-colors hover:bg-[#fbf3f1] disabled:opacity-40"
            >
              확인요청 해제
            </button>
          </div>
        </div>
      )}

      {/* 상태 변경 — 정상 생애주기(순방향) / 예외 처리(종료성) 두 층위로 분리 */}
      <div className="mt-4">
        <p className="mb-2 text-[12.5px] font-[500] text-[#4b5563]">상태 변경</p>
        {/* 정상 진행: 입금대기 → 입금확인 → 연수완료 */}
        <div className="flex items-center gap-1">
          {LIFECYCLE.map((s, i) => (
            <React.Fragment key={s}>
              {i > 0 && <ChevronRight size={14} className="shrink-0 text-[#cbd2da]" />}
              <button
                type="button"
                disabled={pending || app.status === s}
                onClick={() => {
                  if (!confirm(`상태를 "${APPLICATION_STATUS[s].label}"(으)로 변경할까요?`)) return
                  runAndRefresh(() => setApplicationStatus(app.id, s))
                }}
                className={`rounded-[8px] px-3 py-1.5 text-[12.5px] font-[500] transition-colors disabled:cursor-default ${
                  app.status === s
                    ? 'bg-[#1e3a5f] text-white'
                    : 'border border-[#e2e5e9] bg-white text-[#4b5563] hover:bg-[#f7f8f9] disabled:opacity-40'
                }`}
              >
                {APPLICATION_STATUS[s].label}
              </button>
            </React.Fragment>
          ))}
        </div>
        <p className="mt-1.5 text-[11.5px] font-[300] text-[#9ca3af]">
          입금확인 전환 시 통장 대조 시각이 기록됩니다.
        </p>
        {/* 예외 처리: 취소 · 환불완료 (되돌리기 성격 — 분리·danger 톤) */}
        <div className="mt-3 flex items-center gap-2 border-t border-[#f1f3f5] pt-3">
          <span className="shrink-0 text-[11px] font-[400] text-[#9ca3af]">예외 처리</span>
          {EXCEPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              disabled={pending || app.status === s}
              onClick={() => {
                if (!confirm(`상태를 "${APPLICATION_STATUS[s].label}"(으)로 변경할까요? 되돌리기 어려운 처리입니다.`)) return
                runAndRefresh(() => setApplicationStatus(app.id, s))
              }}
              className={`rounded-[8px] px-3 py-1.5 text-[12px] font-[500] transition-colors disabled:cursor-default ${
                app.status === s
                  ? 'bg-[#8f3a2a] text-white'
                  : 'border border-[#e2c9c3] bg-white text-[#8f3a2a] hover:bg-[#fbf3f1] disabled:opacity-40'
              }`}
            >
              {APPLICATION_STATUS[s].label}
            </button>
          ))}
        </div>
      </div>

      {/* 참가자 명단 */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12.5px] font-[500] text-[#4b5563]">
            참가자 {app.participants.length}명
            {insuranceCount > 0 && <span className="ml-1 font-[300] text-[#9ca3af]">· 보험 {insuranceCount}명</span>}
          </p>
        </div>
        <div className="overflow-hidden rounded-[9px] border border-[#eceef1]">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-[#eceef1] bg-[#fafbfc] text-[11.5px] font-[500] text-[#9ca3af]">
                <th className="px-3 py-2">이름</th>
                <th className="px-2 py-2">연락처</th>
                <th className="px-2 py-2">생년월일</th>
                <th className="px-2 py-2">강습</th>
                <th className="px-2 py-2">렌탈</th>
                <th className="px-2 py-2">보험</th>
                <th className="px-3 py-2 text-right">상세</th>
              </tr>
            </thead>
            <tbody>
              {app.participants.map((p) => (
                <tr key={p.id} className="border-b border-[#f4f5f7] last:border-0">
                  <td className="px-3 py-2 text-[12.5px] font-[400] text-[#1f2937]">
                    {p.name}
                    {p.is_leader && <span className="ml-1 text-[10.5px] text-[#3f6a99]">대표</span>}
                  </td>
                  <td className="px-2 py-2 text-[12px] font-[300] tabular-nums text-[#6b7280]">{p.phone ?? '—'}</td>
                  <td className="px-2 py-2 text-[12px] font-[300] tabular-nums text-[#6b7280]">
                    {p.birth_front ?? '—'}
                    {p.has_insurance && <RosterBack roster={roster} id={p.id} />}
                  </td>
                  <td className="px-2 py-2 text-[11.5px] font-[300] text-[#6b7280]">{lessonLabel(p)}</td>
                  <td className="px-2 py-2 text-[11.5px] font-[300] text-[#6b7280]">{rentalLabel(p)}</td>
                  <td className="px-2 py-2 text-[11.5px] font-[300]">{insuranceCell(p)}</td>
                  <td className="px-3 py-2 text-right">
                    <div className="inline-flex items-center gap-2">
                      {app.kind === 'jayul' && !p.is_leader && (
                        <button
                          type="button"
                          disabled={fillBusyId === p.id}
                          onClick={() => copyFillLink(p.id)}
                          className="inline-flex items-center gap-1 text-[12px] font-[400] text-[#3f6a99] hover:underline disabled:opacity-40"
                        >
                          <Link2 size={12} /> {copiedFillId === p.id ? '복사됨' : '링크'}
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => setEditingPart(p)}
                        className="text-[12px] font-[400] text-[#3f6a99] hover:underline"
                      >
                        {p.birth_front ? '수정' : '입력'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 기타 정보 */}
      {(app.special_notes || app.companion_memo || app.referral_source.length > 0) && (
        <div className="mt-4 space-y-1.5 text-[12.5px] font-[300] text-[#4b5563]">
          {app.companion_memo && <p>동반: {app.companion_memo}</p>}
          {app.special_notes && <p>특이사항: {app.special_notes}</p>}
          {app.referral_source.length > 0 && <p>알게된 경로: {app.referral_source.join(', ')}</p>}
        </div>
      )}

      {/* 관리자 메모 */}
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[12.5px] font-[500] text-[#4b5563]">
          관리자 메모 <span className="font-[300] text-[#9ca3af]">(내부용)</span>
        </span>
        <textarea
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          rows={2}
          placeholder="내부 메모…"
          className="w-full resize-y rounded-[9px] border border-[#e2e5e9] bg-white px-3 py-2.5 text-[13px] leading-relaxed text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:border-[#1e3a5f]"
        />
      </label>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[9px] border border-[#e2e5e9] bg-white px-4 py-2.5 text-[13px] font-[500] text-[#4b5563] transition-colors hover:bg-[#f7f8f9]"
        >
          닫기
        </button>
        <button
          type="button"
          disabled={pending || memo.trim() === (app.admin_memo ?? '')}
          onClick={() => runAndRefresh(() => saveAdminMemo(app.id, memo))}
          className="rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? '저장 중…' : '메모 저장'}
        </button>
      </div>
    </AdminModal>

    {editingPart && (
      <ParticipantEditModal
        part={editingPart}
        kind={app.kind}
        pending={pending}
        onClose={() => setEditingPart(null)}
        onSubmit={(input) => runAndRefresh(() => updateParticipantDetail(editingPart.id, input))}
      />
    )}
    </>
  )
}

// 참가자 상세 수기 입력 모달 — 신청 상세에서 열림. 셀프필과 동일 갱신 로직(participantDetail).
// 자율=동반인 후속입력(성함·연락처·기초강습·장비·의류사이즈까지) / 직무=대표 정보 보정(생년월일·성별·뒷자리).
function ParticipantEditModal({
  part,
  kind,
  pending,
  onClose,
  onSubmit,
}: {
  part: ParticipantAdmin
  kind: 'jikmu' | 'jayul'
  pending: boolean
  onClose: () => void
  onSubmit: (input: ParticipantDetailInput) => void
}) {
  const rentals = part.rentals
  const [name, setName] = useState(part.name ?? '')
  const [phone, setPhone] = useState(part.phone ?? '')
  const [birthFront, setBirthFront] = useState(part.birth_front ?? '')
  const [gender, setGender] = useState(part.gender ?? '')
  const [birthBack, setBirthBack] = useState('')
  const [lessonClass, setLessonClass] = useState(part.lesson_level ?? '')
  const [equipment, setEquipment] = useState(typeof rentals.equipment === 'string' ? rentals.equipment : '')
  const [apparel, setApparel] = useState(rentals.apparel === true)
  const [protector, setProtector] = useState(rentals.protector === true)
  const [goggle, setGoggle] = useState(rentals.goggle === true)
  const [glove, setGlove] = useState(rentals.glove === true)
  const [insuranceWanted, setInsuranceWanted] = useState(rentals.insurance_wanted === true)
  const [apparelSize, setApparelSize] = useState(typeof rentals.apparel_size === 'string' ? rentals.apparel_size : '')
  const [protectorSize, setProtectorSize] = useState(typeof rentals.protector_size === 'string' ? rentals.protector_size : '')
  const [gloveSize, setGloveSize] = useState(typeof rentals.glove_size === 'string' ? rentals.glove_size : '')
  const isJayul = kind === 'jayul'
  const inputClass =
    'w-full rounded-[9px] border border-[#e2e5e9] bg-white px-3 py-2.5 text-[13.5px] text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:border-[#1e3a5f]'
  const labelClass = 'mb-1.5 block text-[12.5px] font-[500] text-[#4b5563]'

  const submit = () => {
    const input: ParticipantDetailInput = { birthFront, gender, birthBack }
    if (isJayul) {
      input.name = name
      input.phone = phone
      input.lessonClass = lessonClass
      input.equipment = equipment
      input.apparel = apparel
      input.protector = protector
      input.goggle = goggle
      input.glove = glove
      input.insuranceWanted = insuranceWanted
      input.apparelSize = apparelSize
      input.protectorSize = protectorSize
      input.gloveSize = gloveSize
    }
    onSubmit(input)
  }

  return (
    <AdminModal title={`참가자 정보 · ${part.name}`} onClose={onClose} maxWidth={420}>
      <p className="mb-4 text-[12.5px] font-[300] text-[#6b7280]">
        신청 후 추가로 받은 정보를 입력합니다. 주민번호 뒷자리는 보험 가입 시에만 필요하며 서버에서 암호화되어 저장됩니다.
      </p>

      {isJayul && (
        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className={labelClass}>성함</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="성함" className={inputClass} />
          </label>
          <label className="block">
            <span className={labelClass}>연락처</span>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              inputMode="tel"
              placeholder="010-0000-0000"
              className={inputClass}
            />
          </label>
        </div>
      )}

      <label className={isJayul ? 'mt-3 block' : 'block'}>
        <span className={labelClass}>생년월일 (YYMMDD)</span>
        <input
          value={birthFront}
          onChange={(e) => setBirthFront(e.target.value.replace(/\D/g, '').slice(0, 6))}
          inputMode="numeric"
          placeholder="900101"
          className={inputClass}
        />
      </label>

      <label className="mt-3 block">
        <span className={labelClass}>성별</span>
        <select value={gender} onChange={(e) => setGender(e.target.value)} className={inputClass}>
          <option value="">선택 안 함</option>
          <option value="male">남</option>
          <option value="female">여</option>
        </select>
      </label>

      {isJayul && (
        <>
          <label className="mt-3 block">
            <span className={labelClass}>기초강습</span>
            <select value={lessonClass} onChange={(e) => setLessonClass(e.target.value)} className={inputClass}>
              <option value="">선택 안 함</option>
              {JAYUL_LESSONS.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </label>

          <label className="mt-3 block">
            <span className={labelClass}>용품세트(대여장비)</span>
            <select value={equipment} onChange={(e) => setEquipment(e.target.value)} className={inputClass}>
              <option value="">선택 안 함</option>
              {EQUIPMENT_TYPES.map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label}
                </option>
              ))}
            </select>
          </label>

          {/* 렌탈 옵션 귀속 — 어드민 보정(대표 배정과 동일 필드). 사이즈는 켠 항목만 노출. */}
          <div className="mt-3">
            <span className={labelClass}>렌탈 옵션 · 보험</span>
            <div className="flex flex-wrap gap-1.5">
              {([
                { label: '의류', on: apparel, toggle: () => setApparel((v) => !v) },
                { label: '보호대', on: protector, toggle: () => setProtector((v) => !v) },
                { label: '고글', on: goggle, toggle: () => setGoggle((v) => !v) },
                { label: '장갑', on: glove, toggle: () => setGlove((v) => !v) },
                { label: '보험', on: insuranceWanted, toggle: () => setInsuranceWanted((v) => !v) },
              ] as const).map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={t.toggle}
                  className="rounded-[7px] border px-2.5 py-1 text-[12.5px] transition-colors"
                  style={{ borderColor: t.on ? '#1e3a5f' : '#e2e5e9', background: t.on ? '#1e3a5f' : '#ffffff', color: t.on ? '#ffffff' : '#6b7280' }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {(apparel || protector || glove) && (
            <div className="mt-3 grid grid-cols-3 gap-2">
              {apparel && (
                <label className="block">
                  <span className={labelClass}>의류 사이즈</span>
                  <select value={apparelSize} onChange={(e) => setApparelSize(e.target.value)} className={inputClass}>
                    <option value="">선택</option>
                    {APPAREL_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
              {protector && (
                <label className="block">
                  <span className={labelClass}>보호대 사이즈</span>
                  <select value={protectorSize} onChange={(e) => setProtectorSize(e.target.value)} className={inputClass}>
                    <option value="">선택</option>
                    {GEAR_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
              {glove && (
                <label className="block">
                  <span className={labelClass}>장갑 사이즈</span>
                  <select value={gloveSize} onChange={(e) => setGloveSize(e.target.value)} className={inputClass}>
                    <option value="">선택</option>
                    {GEAR_SIZES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
          )}
        </>
      )}

      <label className="mt-3 block">
        <span className={labelClass}>
          주민번호 뒷자리 <span className="font-[300] text-[#9ca3af]">(보험 가입 시)</span>
        </span>
        <input
          value={birthBack}
          onChange={(e) => setBirthBack(e.target.value.replace(/\D/g, '').slice(0, 7))}
          inputMode="numeric"
          placeholder="입력 시에만 갱신 · 7자리"
          className={inputClass}
        />
        {part.has_insurance && (
          <span className="mt-1 block text-[11.5px] font-[300] text-[#0f5a3c]">이미 등록됨 — 새로 입력하면 교체됩니다.</span>
        )}
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
          onClick={submit}
          className="rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? '저장 중…' : '저장'}
        </button>
      </div>
    </AdminModal>
  )
}

// 복호된 뒷자리 표시(reveal 후에만). reveal 전엔 아무것도 안 그림.
function RosterBack({ roster, id }: { roster: InsuranceRosterEntry[] | null; id: string }) {
  if (!roster) return null
  const hit = roster.find((r) => r.id === id)
  if (!hit) return null
  return <span className="ml-0.5 font-[400] text-[#8f3a2a]">-{hit.birth_back}</span>
}

// 강습 — 직무 대표만 강습반(lesson_level) 값이 있다. 신청폼과 동일 라벨("스키 · 입문반")로 표시.
function lessonLabel(p: ParticipantAdmin): string {
  return lessonLevelLabel(p.lesson_level)
}

// 렌탈 — 용품세트(equipment) + 렌탈 옵션(의류/보호대/고글/장갑)+사이즈. 직무·자율 동일 형태.
// 직무=신청 시 확정 / 자율=대표 배정(옵션)+참가자(사이즈). 미배정 자율은 용품세트만 또는 '—'.
function rentalLabel(p: ParticipantAdmin): string {
  const r = p.rentals
  const items: string[] = []
  if (typeof r.equipment === 'string' && r.equipment) items.push(equipmentLabel(r.equipment))
  if (r.apparel) items.push(`의류${r.apparel_size ? `(${r.apparel_size})` : ''}`)
  if (r.protector) items.push(`보호대${r.protector_size ? `(${r.protector_size})` : ''}`)
  if (r.goggle) items.push('고글')
  if (r.glove) items.push(`장갑${r.glove_size ? `(${r.glove_size})` : ''}`)
  return items.length ? items.join('·') : '—'
}

// 보험 — 직무: 뒷자리 보유 = 가입 / 자율: insurance_wanted 플래그 = 희망(뒷자리 미수집).
function insuranceCell(p: ParticipantAdmin): React.ReactNode {
  if (p.has_insurance) return <span className="font-[500] text-[#0f5a3c]">가입</span>
  if (p.rentals.insurance_wanted === true) return <span className="text-[#8a4b00]">희망</span>
  return <span className="text-[#9ca3af]">—</span>
}
