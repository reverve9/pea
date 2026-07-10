'use client'

import React, { useEffect, useMemo, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, ChevronRight, Download, Link2, Search, Trash2 } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import AdminModal from '@/components/admin/AdminModal'
import AdminList, { type AdminListColumn } from '@/components/admin/AdminList'
import AdminTabs from '@/components/admin/AdminTabs'
import { adminSelectClass } from '@/components/admin/AdminToolbar'
import { formatDate, formatKRW, APPLICATION_STATUS, SCHEDULE_TYPE } from '@/lib/display'
import { isDetailFillClosed, detailFillDeadline } from '@/lib/fillDeadline'
import { exportToExcel } from '@/lib/excel'
import { lessonLevelLabel, lessonSportLabel, equipmentLabel, JAYUL_LESSONS, EQUIPMENT_TYPES, LESSON_CLASSES, LESSON_SPORTS } from '@/lib/lessonOptions'
import { APPAREL_SIZES, GEAR_SIZES } from '@/lib/rentalOptions'
import { PROGRAMS, OPEN_PROGRAMS } from '@/lib/programs'
import type { ParticipantDetailInput } from '@/lib/participantDetail'
import type {
  ApplicationAdmin,
  ApplicationStatus,
  InsuranceRosterEntry,
  ParticipantAdmin,
  RefundRequestAdmin,
  RefundOrigin,
  ModificationRequestAdmin,
  ScheduleType,
} from '@/lib/types'
import {
  setApplicationStatus,
  revertCancel,
  setApplicationWaitlist,
  releasePaymentClaim,
  saveAdminMemo,
  revealInsuranceRoster,
  updateParticipantDetail,
  issueFillLink,
  deleteApplication,
  applyModification,
  setModificationStatus,
  confirmRefundFromRequest,
  rejectRefundRequest,
  confirmDuePayment,
  revertModification,
  revertRefund,
  revertDuePayment,
  registerAdminRefund,
} from './actions'

// 정상 생애주기(순방향 진행) vs 예외/종료(오프램프) — 같은 층위 아님.
const LIFECYCLE: ApplicationStatus[] = ['pending', 'paid', 'completed']

// 프로그램 필터 = 전체 + 신청페이지와 동일 프로그램(종목). 유형/상태는 셀렉트.
// 탭은 개설 종목(OPEN_PROGRAMS)만 — 준비중 종목은 숨김. 매칭류(activeProgram)는 전체 PROGRAMS 유지. [[pea-taxonomy-program-vs-course]]
const PROGRAM_OPTIONS = [{ key: 'all', label: '전체' }, ...OPEN_PROGRAMS.map((p) => ({ key: p.key, label: p.title }))]
const KIND_OPTIONS: { key: 'all' | 'jikmu' | 'jayul'; label: string }[] = [
  { key: 'all', label: '유형 전체' },
  { key: 'jikmu', label: '직무연수' },
  { key: 'jayul', label: '자율패키지' },
]
// 일정구분(schedule_type) 표시 순서 — 연수관리(SessionsClient)와 동일. 필터 옵션은 신청 데이터에 존재하는 값만 이 순서로 노출.
const SCHEDULE_ORDER: ScheduleType[] = ['jikmu', 'weekday_2n', 'weekend_2n', 'weekend_1n']
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

// 신청관리 = 단일 목록. 환불·수정요청은 별도 세그먼트 없이 목록 배지·필터 + 상세에서 확인·처리.
export default function ApplicationsClient({
  applications,
  refunds,
  modifications,
}: {
  applications: ApplicationAdmin[]
  refunds: RefundRequestAdmin[]
  modifications: ModificationRequestAdmin[]
}) {
  return <ApplicationsPanel applications={applications} refunds={refunds} modifications={modifications} />
}

// 신청 목록에 걸린 대기 요청 표시용 — 앱별 pending 환불/수정 플래그. 환불은 origin으로 부분/전액 구분.
type ReqFlag = { refundOrigin: RefundOrigin | null; mod: boolean }
type ReqFilter = 'all' | 'mod' | 'refund'
const REQ_OPTIONS: { key: ReqFilter; label: string }[] = [
  { key: 'all', label: '요청 전체' },
  { key: 'mod', label: '수정요청' },
  { key: 'refund', label: '환불요청' },
]

function ApplicationsPanel({
  applications,
  refunds,
  modifications,
}: {
  applications: ApplicationAdmin[]
  refunds: RefundRequestAdmin[]
  modifications: ModificationRequestAdmin[]
}) {
  const router = useRouter()
  const [detail, setDetail] = useState<ApplicationAdmin | null>(null)

  // 앱별 대기 요청(환불 requested / 수정 pending) 플래그. 이미 fetch한 배열에서 파생(추가 쿼리 없음).
  const reqFlags = new Map<string, ReqFlag>()
  for (const r of refunds) {
    if (r.status === 'requested' && r.application_id) {
      const f = reqFlags.get(r.application_id) ?? { refundOrigin: null, mod: false }
      f.refundOrigin = r.origin
      reqFlags.set(r.application_id, f)
    }
  }
  for (const m of modifications) {
    if (m.status === 'pending' && m.application_id) {
      const f = reqFlags.get(m.application_id) ?? { refundOrigin: null, mod: false }
      f.mod = true
      reqFlags.set(m.application_id, f)
    }
  }
  const flagOf = (id: string): ReqFlag => reqFlags.get(id) ?? { refundOrigin: null, mod: false }

  // 필터 상태 — 프로그램(종목)·유형/일정구분/회차(캐스케이드)·상태·검색(이름/연락처, 실시간)
  const [program, setProgram] = useState('all')
  const [kind, setKind] = useState<'all' | 'jikmu' | 'jayul'>('all')
  const [schedule, setSchedule] = useState<'all' | ScheduleType>('all') // 일정구분
  const [session, setSession] = useState<string>('all') // 회차(session_id)
  const [status, setStatus] = useState<'all' | ApplicationStatus>('all')
  const [assign, setAssign] = useState<AssignFilter>('all')
  const [req, setReq] = useState<ReqFilter>('all')
  const [query, setQuery] = useState('')
  const [reviewOnly, setReviewOnly] = useState(false) // 입금 확인요청(needs_review) 대기건만 소집(배너 토글)

  const activeProgram = PROGRAMS.find((p) => p.key === program)
  const q = query.trim().replace(/\s/g, '')

  // 유형 → 일정구분 → 회차 캐스케이드 옵션 — 신청 데이터에 실제 존재하는 값만(빈 결과 옵션 방지).
  // 회차 라벨은 유형 간 중복 가능 → session_id를 키로. 상위 선택(유형/일정구분)으로 하위 옵션을 좁힌다.
  const scheduleOptions = useMemo(() => {
    const seen = new Set<ScheduleType>()
    for (const a of applications) {
      if (!a.session_id) continue
      if (kind !== 'all' && a.kind !== kind) continue
      seen.add(a.schedule_type)
    }
    return SCHEDULE_ORDER.filter((st) => seen.has(st))
  }, [applications, kind])

  const sessionOptions = useMemo(() => {
    const seen = new Map<string, { label: string; starts_on: string }>()
    for (const a of applications) {
      if (!a.session_id) continue
      if (kind !== 'all' && a.kind !== kind) continue
      if (schedule !== 'all' && a.schedule_type !== schedule) continue
      if (!seen.has(a.session_id)) seen.set(a.session_id, { label: a.session_label, starts_on: a.starts_on })
    }
    return [...seen.entries()]
      .map(([id, v]) => ({ id, label: v.label, starts_on: v.starts_on }))
      .sort((x, y) => x.starts_on.localeCompare(y.starts_on))
  }, [applications, kind, schedule])

  // 캐스케이드 리셋 — 상위 변경 시 하위 선택 무효화(존재하지 않는 옵션에 갇히지 않도록).
  const changeKind = (v: 'all' | 'jikmu' | 'jayul') => {
    setKind(v)
    setSchedule('all')
    setSession('all')
  }
  const changeSchedule = (v: 'all' | ScheduleType) => {
    setSchedule(v)
    setSession('all')
  }

  const filterActive =
    program !== 'all' || kind !== 'all' || schedule !== 'all' || session !== 'all' || status !== 'all' || assign !== 'all' || req !== 'all' || reviewOnly || q !== ''
  const filtered = applications.filter((a) => {
    if (reviewOnly && !a.needs_review) return false
    if (activeProgram && a.program_sport !== activeProgram.sport) return false
    if (kind !== 'all' && a.kind !== kind) return false
    if (schedule !== 'all' && a.schedule_type !== schedule) return false
    if (session !== 'all' && a.session_id !== session) return false
    // 입금대기 = 미입금(pending) + 추가입금 대기(paid/completed + due>0) 모두. 다른 상태 필터는 due>0 제외(추가입금대기로 분류).
    if (status === 'pending') {
      if (!(a.status === 'pending' || a.due_amount > 0)) return false
    } else if (status !== 'all') {
      if (a.status !== status || a.due_amount > 0) return false
    }
    if (assign === 'wait' && !a.is_waitlisted) return false
    if (assign === 'in' && a.is_waitlisted) return false
    if (req === 'mod' && !flagOf(a.id).mod) return false
    if (req === 'refund' && !flagOf(a.id).refundOrigin) return false
    if (q) {
      const hay = `${a.applicant_name}${a.phone}`.replace(/\s/g, '')
      if (!hay.includes(q)) return false
    }
    return true
  })

  const reviewCount = applications.filter((a) => a.needs_review).length
  // 대기건을 다 처리하면(0건) 대기전용 필터 자동 해제 → 빈 목록에 갇히지 않음.
  useEffect(() => {
    if (reviewCount === 0 && reviewOnly) setReviewOnly(false)
  }, [reviewCount, reviewOnly])

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
      cell: (a) => (a.kind === 'jikmu' ? '직무연수' : '자율패키지'),
    },
    {
      key: 'schedule',
      header: '일정구분',
      tdClassName: 'px-2',
      // 직무연수는 일정구분이 유형과 동일(단일) → 배지 중복 대신 '—'. 자율만 주중/주말 배지.
      cell: (a) =>
        a.kind === 'jikmu' ? (
          <span className="text-[12px] text-[#d1d5db]">—</span>
        ) : (
          <Badge color={SCHEDULE_TYPE[a.schedule_type].color} size="sm">
            {SCHEDULE_TYPE[a.schedule_type].label}
          </Badge>
        ),
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
      // 추가입금 부족분(due>0)은 입금확인(paid)에서만 발생 → 단일 '추가입금 대기'로 표시(입금확인+추가입금 병기 아님).
      cell: (a) =>
        a.due_amount > 0 ? (
          <Badge color="orange" size="sm">추가입금 대기</Badge>
        ) : (
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
      key: 'req',
      header: '요청',
      cell: (a) => {
        const f = flagOf(a.id)
        if (!f.mod && !f.refundOrigin) return <span className="text-[12px] text-[#d1d5db]">—</span>
        return (
          <span className="inline-flex items-center gap-1">
            {f.mod && <Badge color="navy" size="sm">수정</Badge>}
            {f.refundOrigin === 'modification' && <Badge color="amber" size="sm">부분환불</Badge>}
            {f.refundOrigin === 'user' && <Badge color="amber" size="sm">환불</Badge>}
          </span>
        )
      },
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

  // 선택·입력 = 공용 툴바 컨트롤 클래스(흰 채움 + 포커스 틴트). [[match-canonical-not-hardcode]]
  const selectClass = adminSelectClass

  // 프로그램(종목) 탭 — 박스 밖(위). 여백 없이 붙은 라운드 없는 사각 탭. 활성=네이비 채움/비활성=흰 채움.
  // 개설 종목이 1개 이하면 종목 구분이 무의미 → 탭 바 자체 숨김(ProgramTabs 정본 방식과 동일).
  const programTabs =
    OPEN_PROGRAMS.length <= 1 ? null : (
      <AdminTabs tabs={PROGRAM_OPTIONS} value={program} onChange={setProgram} className="mb-3" />
    )

  const toolbar = (
    <div className="flex flex-wrap items-center gap-2">
      {/* 유형 → 일정구분 → 회차(캐스케이드) · 상태 · 검색(실시간) */}
      <select className={selectClass} value={kind} onChange={(e) => changeKind(e.target.value as typeof kind)}>
          {KIND_OPTIONS.map((o) => (
            <option key={o.key} value={o.key}>
              {o.label}
            </option>
          ))}
        </select>
        <select className={selectClass} value={schedule} onChange={(e) => changeSchedule(e.target.value as typeof schedule)}>
          <option value="all">일정구분 전체</option>
          {scheduleOptions.map((st) => (
            <option key={st} value={st}>
              {SCHEDULE_TYPE[st].label}
            </option>
          ))}
        </select>
        <select className={selectClass} value={session} onChange={(e) => setSession(e.target.value)}>
          <option value="all">회차 전체</option>
          {sessionOptions.map((s) => (
            <option key={s.id} value={s.id}>
              {s.label}
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
        <select className={selectClass} value={req} onChange={(e) => setReq(e.target.value as ReqFilter)}>
          {REQ_OPTIONS.map((o) => (
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
            className="admin-field w-[180px] rounded-[7px] bg-white py-1.5 pl-7 pr-2.5 text-[12.5px] text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:bg-[#e7eef7]"
          />
        </div>
      </div>
  )

  const emptyLabel =
    activeProgram && !activeProgram.ready
      ? `${activeProgram.title} 연수는 준비 중입니다.`
      : '조건에 맞는 신청이 없습니다.'

  // 엑셀 내보내기 — 현재 필터가 적용된 목록을 그대로 시트로. 금액은 숫자(천단위 포맷은 엑셀 유틸이 적용).
  const exportExcel = () =>
    exportToExcel(
      filtered.map((a) => ({
        no: a.application_no,
        created: formatDate(a.created_at.slice(0, 10)),
        status: APPLICATION_STATUS[a.status].label,
        assign: a.is_waitlisted ? '예비' : '정원',
        track: a.track_label,
        sport: lessonSportLabel(a.participants.find((p) => p.is_leader)?.lesson_level) || (a.program_sport ?? ''),
        session: a.session_label,
        period: a.period,
        applicant: a.applicant_name,
        phone: a.phone,
        school: a.school_name ?? '',
        region: a.region ?? '',
        payer: a.payer_name ?? '',
        headcount: a.headcount,
        amount: a.total_amount,
        notes: a.special_notes ?? '',
        claim: a.payment_claimed_at ? (a.payment_claim_name ?? '요청') : '',
        memo: a.admin_memo ?? '',
      })),
      [
        { key: 'no', label: '신청번호' },
        { key: 'created', label: '신청일' },
        { key: 'status', label: '상태' },
        { key: 'assign', label: '배정' },
        { key: 'track', label: '유형' },
        { key: 'sport', label: '종목' },
        { key: 'session', label: '회차' },
        { key: 'period', label: '기간' },
        { key: 'applicant', label: '신청자' },
        { key: 'phone', label: '연락처' },
        { key: 'school', label: '소속' },
        { key: 'region', label: '지역' },
        { key: 'payer', label: '입금자명' },
        { key: 'headcount', label: '인원' },
        { key: 'amount', label: '금액' },
        { key: 'notes', label: '요청사항' },
        { key: 'claim', label: '입금확인요청' },
        { key: 'memo', label: '관리자메모' },
      ],
      '신청목록',
    )

  const exportButton = (
    <button
      type="button"
      onClick={exportExcel}
      disabled={filtered.length === 0}
      className="flex items-center gap-1.5 rounded-[8px] bg-[#1e6b4f] px-3 py-1.5 text-[12px] font-[500] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
    >
      <Download size={13} />
      엑셀 내보내기
    </button>
  )

  return (
    <>
      {reviewCount > 0 && (
        <div className="mb-3 ml-auto flex w-fit items-center gap-2 rounded-[8px] bg-[#f3f6f9] px-3.5 py-2.5 text-[12.5px]">
          <Badge color="amber" size="sm">입금확인요청</Badge>
          <span className="flex items-baseline gap-3.5">
            <span className="text-[14px] font-[700] tabular-nums text-[#1e3a5f]">{reviewCount}건</span>
            <span className="font-[400] text-[#4b5563]">통장 대조 후 처리해 주세요</span>
          </span>
          <button
            type="button"
            onClick={() => setReviewOnly((v) => !v)}
            className={`ml-auto shrink-0 rounded-[7px] px-2.5 py-1 text-[11.5px] font-[500] transition-colors ${
              reviewOnly
                ? 'bg-[#1e3a5f] text-white hover:bg-[#152a46]'
                : 'bg-[#1e3a5f]/[0.08] text-[#1e3a5f] hover:bg-[#1e3a5f]/[0.14]'
            }`}
          >
            {reviewOnly ? '전체 보기' : '확인요청건 보기'}
          </button>
        </div>
      )}

      {programTabs}

      <AdminList
        items={filtered}
        columns={columns}
        getRowKey={(a) => a.id}
        toolbar={toolbar}
        exportButton={exportButton}
        emptyLabel={emptyLabel}
        resetKey={`${program}|${kind}|${status}|${assign}|${req}|${reviewOnly}|${q}`}
        total={applications.length}
        filterActive={filterActive}
      />

      {detail && (
        <DetailModal
          app={detail}
          pendingMods={modifications.filter((m) => m.status === 'pending' && m.application_id === detail.id)}
          pendingRefunds={refunds.filter((r) => r.status !== 'completed' && r.status !== 'rejected' && r.application_id === detail.id)}
          processedMods={modifications.filter((m) => m.status !== 'pending' && m.application_id === detail.id)}
          processedRefunds={refunds.filter((r) => r.status === 'completed' && r.application_id === detail.id)}
          onClose={() => setDetail(null)}
          onChanged={() => router.refresh()}
        />
      )}
    </>
  )
}

// 상세 모달 내 환불요청 인라인 처리 — 금액 입력 → refunded_amount 반영 + 요청 완료.
function RefundInline({
  r,
  appId,
  total,
  pending,
  runAndRefresh,
}: {
  r: RefundRequestAdmin
  appId: string
  total: number
  pending: boolean
  runAndRefresh: (fn: () => Promise<{ ok: boolean; error?: string }>) => void
}) {
  const [amount, setAmount] = useState(String(r.amount ?? ''))
  const [markRefunded, setMarkRefunded] = useState(r.origin !== 'modification')
  // 수정 감액 자동생성 건은 계좌가 비어 있음 → 어드민이 유선 확보한 계좌를 여기서 기록.
  const [account, setAccount] = useState('')
  const needsAccount = !r.refund_account
  const confirmRefund = () => {
    const amt = parseInt(amount, 10)
    if (!Number.isInteger(amt) || amt < 0) return alert('환불 금액을 확인해 주세요.')
    if (needsAccount && !account.trim()) return alert('환불 계좌를 입력해 주세요 (고객에게 확인 후 기록).')
    if (!confirm(`환불 ${formatKRW(amt)}${markRefunded ? ' (전액 · 환불완료 전환)' : ' (부분환불)'}을 확정할까요? 정산에 반영됩니다.`)) return
    runAndRefresh(() => confirmRefundFromRequest(r.id, appId, amt, markRefunded, account.trim() || undefined))
  }
  const rejectRefund = () => {
    if (!confirm('이 환불요청을 거절할까요? 환불액은 반영되지 않고 요청만 종료됩니다.')) return
    runAndRefresh(() => rejectRefundRequest(r.id))
  }
  return (
    <div className="mb-2 rounded-[10px] bg-[#fdf4e3] p-3">
      <div className="flex items-center gap-1.5">
        <Badge color="amber" size="sm">{r.origin === 'modification' ? '부분환불요청' : '환불요청'}</Badge>
        {r.origin === 'modification' && (
          <span className="rounded-[4px] bg-[#eef2f7] px-1.5 py-0.5 text-[11px] font-[500] text-[#3f6a99]">수정연동</span>
        )}
        <span className="text-[11.5px] font-[300] text-[#8a6d3b]">{formatDate(r.created_at.slice(0, 10))}</span>
      </div>
      <div className="mt-1.5 space-y-0.5 text-[12.5px] font-[300] text-[#6b5836]">
        {r.reason && <p>사유: {r.reason}</p>}
        {r.refund_account ? (
          <p>환불계좌: {r.refund_account}</p>
        ) : (
          <div className="pt-0.5">
            <p className="text-[11.5px] font-[400] text-[#a06a1a]">환불계좌 미입력 — 고객에게 확인 후 기록</p>
            <input
              value={account}
              onChange={(e) => setAccount(e.target.value)}
              placeholder="은행 · 예금주 · 계좌번호"
              className="admin-field mt-1 w-full rounded-[8px] bg-white px-2.5 py-1.5 text-[12.5px] text-[#1f2937] outline-none focus:bg-[#f3f5f8]"
            />
          </div>
        )}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          placeholder="환불 금액"
          className="admin-field w-32 rounded-[8px] bg-white px-2.5 py-1.5 text-[12.5px] tabular-nums text-[#1f2937] outline-none focus:bg-[#f3f5f8]"
        />
        <RefundQuick total={total} onPick={(v) => setAmount(String(v))} />
        <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] font-[400] text-[#6b5836]">
          <input type="checkbox" checked={markRefunded} onChange={(e) => setMarkRefunded(e.target.checked)} className="h-3.5 w-3.5 accent-[#1e3a5f]" />
          전액(환불완료 전환)
        </label>
        <button
          type="button"
          disabled={pending}
          onClick={rejectRefund}
          className="ml-auto rounded-[8px] bg-[#f0ddb8] px-3 py-2 text-[12.5px] font-[500] text-[#8a6d3b] transition-colors hover:bg-[#e9d0a0] disabled:opacity-40"
        >
          거절
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={confirmRefund}
          className="rounded-[8px] bg-[#1e3a5f] px-3.5 py-2 text-[12.5px] font-[500] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          환불 확정
        </button>
      </div>
    </div>
  )
}

// 환불 금액 단축 — 전액(100%)·반액(50%). 결제 총액 기준. 인라인 환불(요청·관리자) 공용.
function RefundQuick({ total, onPick }: { total: number; onPick: (v: number) => void }) {
  return (
    <div className="flex gap-1">
      <button type="button" onClick={() => onPick(total)} className="rounded-[6px] bg-[#eef1f4] px-2 py-1 text-[11px] font-[400] text-[#6b7280] transition-colors hover:bg-[#e4e8ec]">전액</button>
      <button type="button" onClick={() => onPick(Math.round(total / 2))} className="rounded-[6px] bg-[#eef1f4] px-2 py-1 text-[11px] font-[400] text-[#6b7280] transition-colors hover:bg-[#e4e8ec]">반액</button>
    </div>
  )
}

// 관리자 직접 환불 등록(인라인) — 요청 없이 개시. registerAdminRefund 로 refund_request(admin·완료) 생성 + 환불 반영.
// 모달 위 모달 폐지: 상세 안 인라인 폼. 되돌리기는 '처리된 요청'(revertRefund)으로 통일.
function AdminRefundInline({
  app,
  pending,
  runAndRefresh,
  onDone,
}: {
  app: ApplicationAdmin
  pending: boolean
  runAndRefresh: (fn: () => Promise<{ ok: boolean; error?: string }>) => void
  onDone: () => void
}) {
  const [amount, setAmount] = useState(String(app.total_amount))
  const [markRefunded, setMarkRefunded] = useState(true)
  const [account, setAccount] = useState('')
  const [reason, setReason] = useState('')
  const submit = () => {
    const amt = parseInt(amount, 10)
    if (!Number.isInteger(amt) || amt <= 0) return alert('환불 금액을 확인해 주세요.')
    if (amt > app.total_amount && !confirm('환불액이 결제 총액보다 큽니다. 그대로 진행할까요?')) return
    if (!confirm(`관리자 환불 ${formatKRW(amt)}${markRefunded ? ' (전액 · 환불완료)' : ' (부분)'}을 등록할까요? 정산에 반영됩니다.`)) return
    runAndRefresh(() => registerAdminRefund(app.id, amt, markRefunded, account, reason))
  }
  return (
    <div className="mt-3 rounded-[10px] bg-[#f6e9e5] p-3">
      <p className="text-[12px] font-[500] text-[#8f3a2a]">관리자 직접 환불 등록</p>
      <p className="mt-0.5 text-[11px] font-[300] text-[#a56a5c]">요청 없이 개시(폐강 · 비대면 · 중복입금 · 재량). 등록 시 이력 · 마이페이지에 잡히고, 되돌리기는 ‘처리된 요청’에서.</p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <input
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/\D/g, ''))}
          inputMode="numeric"
          placeholder="환불 금액"
          className="admin-field w-32 rounded-[8px] bg-white px-2.5 py-1.5 text-[12.5px] tabular-nums text-[#1f2937] outline-none focus:bg-[#f3f5f8]"
        />
        <RefundQuick total={app.total_amount} onPick={(v) => setAmount(String(v))} />
        <label className="flex cursor-pointer items-center gap-1.5 text-[11.5px] font-[400] text-[#8f3a2a]">
          <input type="checkbox" checked={markRefunded} onChange={(e) => setMarkRefunded(e.target.checked)} className="h-3.5 w-3.5 accent-[#8f3a2a]" />
          전액(환불완료 전환)
        </label>
      </div>
      <input
        value={account}
        onChange={(e) => setAccount(e.target.value)}
        placeholder="환불 계좌 (선택 · 은행 · 예금주 · 계좌번호)"
        className="admin-field mt-2 w-full rounded-[8px] bg-white px-2.5 py-1.5 text-[12.5px] text-[#1f2937] outline-none focus:bg-[#f3f5f8]"
      />
      <input
        value={reason}
        onChange={(e) => setReason(e.target.value)}
        placeholder="사유 (선택 · 폐강 / 중복입금 등)"
        className="admin-field mt-2 w-full rounded-[8px] bg-white px-2.5 py-1.5 text-[12.5px] text-[#1f2937] outline-none focus:bg-[#f3f5f8]"
      />
      <div className="mt-2 flex justify-end gap-2">
        <button type="button" onClick={onDone} className="rounded-[8px] bg-white px-3 py-1.5 text-[12px] font-[400] text-[#8f3a2a] transition-colors hover:bg-[#fbf5f3]">닫기</button>
        <button
          type="button"
          disabled={pending}
          onClick={submit}
          className="rounded-[8px] bg-[#8f3a2a] px-3.5 py-1.5 text-[12px] font-[500] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          환불 등록
        </button>
      </div>
    </div>
  )
}

// ── 상세 모달 ──
function DetailModal({
  app,
  pendingMods,
  pendingRefunds,
  processedMods,
  processedRefunds,
  onClose,
  onChanged,
}: {
  app: ApplicationAdmin
  pendingMods: ModificationRequestAdmin[]
  pendingRefunds: RefundRequestAdmin[]
  processedMods: ModificationRequestAdmin[]
  processedRefunds: RefundRequestAdmin[]
  onClose: () => void
  onChanged: () => void
}) {
  const [pending, startTransition] = useTransition()
  const [memo, setMemo] = useState(app.admin_memo ?? '')
  const [roster, setRoster] = useState<InsuranceRosterEntry[] | null>(null)
  const [editingPart, setEditingPart] = useState<ParticipantAdmin | null>(null)
  const [copiedFillId, setCopiedFillId] = useState<string | null>(null)
  const [fillBusyId, setFillBusyId] = useState<string | null>(null)
  const [adminRefundOpen, setAdminRefundOpen] = useState(false)

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
        {(app.school_name || app.region) && (
          <p className="mt-1 text-[12.5px] font-[300] text-[#6b7280]">
            {[app.school_name, app.region].filter(Boolean).join(' · ')}
          </p>
        )}
        <p className="mt-1 text-[13px] font-[400] tabular-nums text-[#1f2937]">
          결제금액 {formatKRW(app.total_amount)}
        </p>
      </div>

      {/* 소프트 정원 예비 — 정원 초과 접수분. 승인=정원 편입 / 거절=취소 */}
      {app.is_waitlisted && (
        <div className="mt-3 rounded-[10px] bg-[#fdeadb] p-4">
          <p className="text-[12px] font-[500] text-[#b4551a]">정원 초과 · 예비</p>
          <p className="mt-1.5 text-[13px] font-[300] text-[#374151]">
            회차 정원을 초과해 예비로 접수된 신청입니다. 승인 시 정식 접수되고, 거절 시 취소 처리됩니다.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm('이 예비 건을 승인해 신청 접수할까요?')) return
                runAndRefresh(() => setApplicationWaitlist(app.id, false))
              }}
              className="rounded-[8px] bg-[#1e3a5f] px-3.5 py-2 text-[12.5px] font-[500] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              승인 → 신청 접수
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (!confirm('이 대기 건을 거절(취소)할까요? 되돌리기 어려운 처리입니다.')) return
                runAndRefresh(() => setApplicationStatus(app.id, 'cancelled'))
              }}
              className="rounded-[8px] bg-[#f6e9e5] px-3.5 py-2 text-[12.5px] font-[500] text-[#8f3a2a] transition-colors hover:bg-[#efddd7] disabled:opacity-40"
            >
              거절 (취소)
            </button>
          </div>
        </div>
      )}

      {/* 입금 확인요청 — 컴팩트 한 줄(대조용 입금자명+불일치). 상태변경은 아래 스테퍼 '입금확인'으로 → 배지 자동 소거. */}
      {app.payment_claimed_at && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[8px] bg-[#fdf4e3] px-3 py-2 text-[12.5px]">
          <Badge color="amber" size="sm">입금확인요청</Badge>
          <span className="font-[300] text-[#6b5836]">
            입금자명{' '}
            <span className={`font-[500] ${app.payer_mismatch ? 'text-[#c0392b]' : 'text-[#1f2937]'}`}>
              {app.payment_claim_name ?? '(미입력)'}
            </span>
          </span>
          {app.payer_mismatch && (
            <span className="inline-flex items-center gap-1 text-[11.5px] font-[400] text-[#c0392b]">
              <AlertTriangle size={12} /> 신청자명 불일치
            </span>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm('입금 확인요청을 해제할까요? 신청자가 다시 요청할 수 있게 됩니다.')) return
              runAndRefresh(() => releasePaymentClaim(app.id))
            }}
            className="ml-auto text-[11.5px] font-[400] text-[#a86a5c] underline-offset-2 hover:underline disabled:opacity-40"
          >
            해제
          </button>
        </div>
      )}

      {/* 추가입금 대기 — 수정 증액으로 생긴 부족분. 단순 입금대기와 구분(이미 base 입금확인된 건). */}
      {app.due_amount > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-[8px] bg-[#f4ebe4] px-3 py-2 text-[12.5px]">
          <Badge color="orange" size="sm">추가입금 대기</Badge>
          <span className="font-[300] text-[#6b5340]">
            부족분 <span className="font-[600] tabular-nums text-[#b0561f]">{formatKRW(app.due_amount)}</span> — 수정 반영으로 발생
          </span>
          {app.due_claimed_at && (
            <span className="rounded-[4px] bg-[#eaf4ec] px-1.5 py-0.5 text-[11px] font-[500] text-[#2f803a]">고객 입금완료 신고</span>
          )}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm(`추가입금 ${formatKRW(app.due_amount)}을 확인했습니까? 확인 시 추가입금 대기가 해제됩니다.`)) return
              runAndRefresh(() => confirmDuePayment(app.id))
            }}
            className="ml-auto rounded-[7px] bg-[#1e3a5f] px-3 py-1.5 text-[12px] font-[500] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            추가입금 확인
          </button>
        </div>
      )}

      {/* 추가입금 확인됨 — 정규 입금확인의 '입금대기' 회귀와 동등하게 되돌리기 버튼 제공(오클릭 복구).
          보존한 due_settled_amount 를 due_amount 로 복원 → '추가입금 대기'로 즉시 회귀(마이·정산 반영). */}
      {app.due_amount === 0 && app.due_settled_amount != null && (
        <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-[8px] bg-[#eef4ee] px-3 py-2 text-[12px]">
          <Badge color="emerald" size="sm">추가입금 확인됨</Badge>
          <span className="font-[300] tabular-nums text-[#4b6b52]">부족분 {formatKRW(app.due_settled_amount)} 입금완료 처리</span>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (!confirm('추가입금 확인을 되돌릴까요? "추가입금 대기"로 복원됩니다.')) return
              runAndRefresh(() => revertDuePayment(app.id))
            }}
            className="ml-auto rounded-[7px] bg-[#f6e9e5] px-3 py-1.5 text-[12px] font-[500] text-[#8f3a2a] transition-colors hover:bg-[#efddd7] disabled:opacity-40"
          >
            추가입금 대기로 되돌리기
          </button>
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
                    : 'bg-[#eef1f4] text-[#4b5563] hover:bg-[#e4e8ec] disabled:opacity-40'
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
          {/* 취소 = 토글 버튼. 취소 상태면 같은 자리서 '취소 되돌리기'로 전환(두 버튼 병치 방지).
              되돌리기는 입금확인 이력 있으면 입금확인, 없으면 입금대기로 복원(기준일 보존). */}
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              if (app.status === 'cancelled') {
                if (!confirm('취소를 되돌릴까요? 입금 이력이 있으면 "입금 확인", 없으면 "입금 대기"로 복원됩니다.')) return
                runAndRefresh(() => revertCancel(app.id))
              } else {
                if (!confirm('신청을 취소 처리할까요? (취소 후에도 목록에 남으며 되돌릴 수 있습니다.)')) return
                runAndRefresh(() => setApplicationStatus(app.id, 'cancelled'))
              }
            }}
            className={`rounded-[8px] px-3 py-1.5 text-[12px] font-[500] transition-colors disabled:opacity-40 ${
              app.status === 'cancelled'
                ? 'bg-[#eef2f7] text-[#3f6a99] hover:bg-[#e4ebf3]'
                : 'bg-[#f6e9e5] text-[#8f3a2a] hover:bg-[#efddd7]'
            }`}
          >
            {app.status === 'cancelled' ? '재신청' : '신청취소'}
          </button>
          {/* 관리자 직접 환불 — 요청 없이 개시(폐강·비대면·중복입금·재량). 모달 대신 인라인 폼(모달 위 모달 폐지).
              등록 시 refund_request(admin, 완료)로 잡혀 이력·마이·되돌리기('처리된 요청')로 통일. */}
          <button
            type="button"
            disabled={pending}
            onClick={() => setAdminRefundOpen((v) => !v)}
            className="rounded-[8px] bg-[#f6e9e5] px-3 py-1.5 text-[12px] font-[500] text-[#8f3a2a] transition-colors hover:bg-[#efddd7] disabled:opacity-40"
          >
            환불 등록
          </button>
        </div>
        {adminRefundOpen && (
          <AdminRefundInline
            app={app}
            pending={pending}
            runAndRefresh={runAndRefresh}
            onDone={() => setAdminRefundOpen(false)}
          />
        )}
      </div>

      {/* 참가자 명단 */}
      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-[12.5px] font-[500] text-[#4b5563]">
            참가자 {app.participants.length}명
            {insuranceCount > 0 && <span className="ml-1 font-[300] text-[#9ca3af]">· 보험 {insuranceCount}명</span>}
          </p>
        </div>
        <div className="overflow-hidden rounded-[9px] bg-[#fafbfc]">
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

      {/* 들어온 요청 — 이 신청에 걸린 대기 수정/환불요청을 상세에서 바로 확인·처리 */}
      {(pendingMods.length > 0 || pendingRefunds.length > 0) && (
        <div className="mt-5">
          <p className="mb-2 text-[12.5px] font-[500] text-[#4b5563]">들어온 요청</p>

          {pendingMods.map((m) => (
            <div key={m.id} className="mb-2 rounded-[10px] bg-[#eef2f7] p-3">
              <div className="flex items-center gap-1.5">
                <Badge color="navy" size="sm">수정요청</Badge>
                <span className="text-[11.5px] font-[300] text-[#6b7280]">{formatDate(m.created_at.slice(0, 10))}</span>
              </div>
              <div className="mt-2 space-y-1">
                {m.changes.length === 0 ? (
                  <p className="text-[12px] font-[300] text-[#9ca3af]">구조화된 변경 항목이 없습니다.</p>
                ) : (
                  m.changes.map((c, i) => (
                    <div key={i} className="text-[12.5px]">
                      <span className="text-[11.5px] font-[500] text-[#6b7280]">{c.participant_name} · {c.label}</span>{' '}
                      <span className="tabular-nums text-[#9ca3af] line-through">{c.current || '(없음)'}</span>
                      <span className="text-[#9ca3af]"> → </span>
                      <span className="font-[500] tabular-nums text-[#1e3a5f]">{c.requested || '(없음)'}</span>
                    </div>
                  ))
                )}
              </div>
              {m.user_note && <p className="mt-1.5 text-[12px] font-[300] text-[#8a4b00]">특이사항: {m.user_note}</p>}
              <div className="mt-2.5 flex gap-2">
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm('요청 내용을 신청에 반영하고 처리완료로 전환할까요? 요금이 바뀌면 환불요청/추가입금이 자동 처리됩니다.')) return
                    runAndRefresh(() => applyModification(m.id, ''))
                  }}
                  className="rounded-[8px] bg-[#1e3a5f] px-3.5 py-2 text-[12.5px] font-[500] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  반영 · 처리완료
                </button>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm('이 수정요청을 반려할까요? 고객에게 반려로 표시됩니다.')) return
                    runAndRefresh(() => setModificationStatus(m.id, 'rejected'))
                  }}
                  className="rounded-[8px] bg-[#f6e9e5] px-3.5 py-2 text-[12.5px] font-[500] text-[#8f3a2a] transition-colors hover:bg-[#efddd7] disabled:opacity-40"
                >
                  반려
                </button>
              </div>
            </div>
          ))}

          {pendingRefunds.map((r) => (
            <RefundInline key={r.id} r={r} appId={app.id} total={app.total_amount} pending={pending} runAndRefresh={runAndRefresh} />
          ))}
        </div>
      )}

      {/* 처리된 요청 — 오클릭 복구용 되돌리기(재오픈 + 금액 복원). 참가자 필드는 변경 전 스냅샷으로 역복원. */}
      {(processedMods.length > 0 || processedRefunds.length > 0) && (
        <div className="mt-4">
          <p className="mb-2 text-[12.5px] font-[500] text-[#8a94a0]">처리된 요청</p>
          {processedMods.map((m) => {
            const summary = m.changes.map((c) => `${c.participant_name} ${c.label}`).join(', ') || '변경 항목 없음'
            const isCompleted = m.status === 'completed'
            return (
              <div key={m.id} className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[9px] bg-[#f4f6f8] px-3 py-2 text-[12px]">
                <Badge color={isCompleted ? 'emerald' : 'slate'} size="sm">{isCompleted ? '수정 반영완료' : '수정 반려'}</Badge>
                <span className="font-[300] text-[#6b7280]">{summary}</span>
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => {
                    if (!confirm(isCompleted
                      ? '반영을 되돌릴까요? 참가자 정보·금액이 변경 전으로 복원되고 요청은 대기로 재오픈됩니다.'
                      : '반려를 취소하고 요청을 대기로 재오픈할까요?')) return
                    runAndRefresh(() => (isCompleted ? revertModification(m.id) : setModificationStatus(m.id, 'pending')))
                  }}
                  className="ml-auto text-[11.5px] font-[400] text-[#3f6a99] underline-offset-2 hover:underline disabled:opacity-40"
                >
                  되돌리기
                </button>
              </div>
            )
          })}
          {processedRefunds.map((r) => (
            <div key={r.id} className="mb-2 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-[9px] bg-[#f4f6f8] px-3 py-2 text-[12px]">
              <Badge color="emerald" size="sm">{r.origin === 'modification' ? '부분환불 완료' : r.origin === 'admin' ? '관리자 환불 완료' : '환불 완료'}</Badge>
              {r.amount != null && <span className="font-[300] tabular-nums text-[#6b7280]">{formatKRW(r.amount)}</span>}
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (!confirm('환불 확정을 되돌릴까요? 환불액이 0으로 복원되고 요청이 재오픈됩니다. (실제 환불금 지급 여부는 별도 확인)')) return
                  runAndRefresh(() => revertRefund(r.id, app.id))
                }}
                className="ml-auto text-[11.5px] font-[400] text-[#3f6a99] underline-offset-2 hover:underline disabled:opacity-40"
              >
                되돌리기
              </button>
            </div>
          ))}
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
          className="admin-field w-full resize-y rounded-[9px] bg-[#f4f6f8] px-3 py-2.5 text-[13px] leading-relaxed text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:bg-[#eaeef2]"
        />
      </label>

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-[9px] bg-[#eef1f4] px-4 py-2.5 text-[13px] font-[500] text-[#4b5563] transition-colors hover:bg-[#e4e8ec]"
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

      {/* 위험구역 — 물리 삭제(되돌릴 수 없음). 취소(cancelled)와 다름: 통계·정산에서도 완전 제거. */}
      <div className="mt-6 flex items-center justify-between gap-3 rounded-[10px] bg-[#faf0ee] px-4 py-3">
        <div>
          <p className="text-[12.5px] font-[500] text-[#8f3a2a]">신청 삭제</p>
          <p className="mt-0.5 text-[11.5px] font-[300] leading-[1.5] text-[#a86a5c]">
            되돌릴 수 없습니다. 참가자·연동 요청 기록이 함께 삭제되고 통계·정산에서 제외됩니다. (단순 취소는 위 ‘취소’를 사용)
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            if (!confirm(`[${app.application_no}] ${app.applicant_name} 신청을 완전히 삭제할까요?\n\n되돌릴 수 없습니다. 참가자 정보와 연동 요청 기록까지 사라집니다.`)) return
            if (!confirm('정말 삭제합니다. 이 작업은 취소할 수 없습니다. 계속할까요?')) return
            runAndRefresh(() => deleteApplication(app.id))
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-[8px] bg-[#8f3a2a] px-3.5 py-2 text-[12.5px] font-[500] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          <Trash2 size={13} /> 삭제
        </button>
      </div>
    </AdminModal>

    {editingPart && (
      <ParticipantEditModal
        part={editingPart}
        kind={app.kind}
        startsOn={app.starts_on}
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
  startsOn,
  pending,
  onClose,
  onSubmit,
}: {
  part: ParticipantAdmin
  kind: 'jikmu' | 'jayul'
  startsOn: string
  pending: boolean
  onClose: () => void
  onSubmit: (input: ParticipantDetailInput) => void
}) {
  // 입력 마감(연수 시작 − 10일) 이후엔 직접수정 잠금 → 수정요청. 마감 후엔 정보확인만.
  const closed = startsOn ? isDetailFillClosed(startsOn) : false
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
    'admin-field w-full rounded-[9px] bg-[#f4f6f8] px-3 py-2.5 text-[13.5px] text-[#1f2937] outline-none placeholder:text-[#b0b6be] focus:bg-[#eaeef2]'
  const labelClass = 'mb-1.5 block text-[12.5px] font-[500] text-[#4b5563]'

  const submit = () => {
    // 성함·연락처·강습·렌탈은 직무/자율 공통 편집. 용품세트·보험희망 플래그는 자율 전용 필드.
    const input: ParticipantDetailInput = {
      birthFront,
      gender,
      birthBack,
      name,
      phone,
      lessonClass,
      apparel,
      protector,
      goggle,
      glove,
      apparelSize,
      protectorSize,
      gloveSize,
    }
    if (isJayul) {
      input.equipment = equipment
      input.insuranceWanted = insuranceWanted
    }
    onSubmit(input)
  }

  return (
    <AdminModal title={`참가자 정보 · ${part.name}`} onClose={onClose} maxWidth={420}>
      <p className="mb-4 text-[12.5px] font-[300] text-[#6b7280]">
        신청 후 추가로 받은 정보를 입력합니다. 주민번호 뒷자리는 보험 가입 시에만 필요하며 서버에서 암호화되어 저장됩니다.
        렌탈·강습을 바꿔도 결제금액은 이 편집으로 변경되지 않습니다(요금 변동은 수정요청).
      </p>

      {closed && (
        <div className="mb-4 rounded-[10px] bg-[#fdf4e3] p-3 text-[12.5px] font-[400] text-[#8a6d3b]">
          입력 마감({startsOn && formatDate(detailFillDeadline(startsOn))})이 지나 직접수정할 수 없습니다. 정보 확인만 가능하며, 변경이 필요하면 <b className="font-[600]">수정요청</b>으로 처리해 주세요.
        </div>
      )}

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

      <label className="mt-3 block">
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

      <label className="mt-3 block">
        <span className={labelClass}>강습</span>
        <select value={lessonClass} onChange={(e) => setLessonClass(e.target.value)} className={inputClass}>
          <option value="">선택 안 함</option>
          {isJayul
            ? JAYUL_LESSONS.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))
            : LESSON_SPORTS.map((sp) => (
                <optgroup key={sp.key} label={sp.label}>
                  {LESSON_CLASSES[sp.key].map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.label}
                    </option>
                  ))}
                </optgroup>
              ))}
        </select>
      </label>

      {isJayul && (
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
      )}

      {/* 렌탈 옵션 — 직무/자율 공통 보정. 보험 희망 토글은 자율 전용. 사이즈는 켠 항목만 노출. */}
      <div className="mt-3">
        <span className={labelClass}>렌탈 옵션{isJayul ? ' · 보험' : ''}</span>
        <div className="flex flex-wrap gap-1.5">
          {[
            { label: '의류', on: apparel, toggle: () => setApparel((v) => !v) },
            { label: '보호대', on: protector, toggle: () => setProtector((v) => !v) },
            { label: '고글', on: goggle, toggle: () => setGoggle((v) => !v) },
            { label: '장갑', on: glove, toggle: () => setGlove((v) => !v) },
            ...(isJayul
              ? [{ label: '보험', on: insuranceWanted, toggle: () => setInsuranceWanted((v) => !v) }]
              : []),
          ].map((t) => (
            <button
              key={t.label}
              type="button"
              onClick={t.toggle}
              className={`rounded-[7px] px-2.5 py-1 text-[12.5px] transition-colors ${
                t.on ? 'bg-[#1e3a5f] text-white' : 'bg-[#eef1f4] text-[#6b7280] hover:bg-[#e4e8ec]'
              }`}
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
          className="rounded-[9px] bg-[#eef1f4] px-4 py-2.5 text-[13px] font-[500] text-[#4b5563] transition-colors hover:bg-[#e4e8ec]"
        >
          취소
        </button>
        <button
          type="button"
          disabled={pending || closed}
          onClick={submit}
          className="rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {pending ? '저장 중…' : closed ? '마감됨' : '저장'}
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
