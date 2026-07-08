'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Smartphone, FileText, RefreshCcw, Pencil, CheckCircle2 } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import ExtendedHeader from '@/components/layout/ExtendedHeader'
import SectionTitle from '@/components/common/SectionTitle'
import WhiteBox from '@/components/common/WhiteBox'
import Text from '@/components/common/Text'
import { Button } from '@/components/common/Button'
import { Badge, type BadgeColor } from '@/components/common/Badge'
import { LoadingState } from '@/components/common/StateView'
import { MasterDetailProvider, MasterDetailList, MasterDetailDetail } from '@/components/shell/MasterDetail'
import { useQuery } from '@/lib/useQuery'
import { getSiteContent } from '@/lib/queries'
import { submitMyRequest, fetchMyRoster, submitMyParticipant, requestMyFillLink, assignParticipantOptions } from '@/lib/applyClient'
import ParticipantFillSlot from '@/components/features/ParticipantFillSlot'
import { RENTAL_OPTIONS, type RentalOptionKey } from '@/lib/rentalOptions'
import { JAYUL_LESSONS, EQUIPMENT_TYPES, lessonLevelLabel, equipmentLabel } from '@/lib/lessonOptions'
import type { SiteContent, ModificationField, ModificationChange } from '@/lib/types'
import type { MyApplicationRow, MyRosterParticipant, RentalQty, RentalAssignmentInput } from '@/lib/applicationTypes'

// §3-4 마이페이지 — 전화 조회 게이트 → 신청목록 마스터-디테일(셸 패턴2). [[jayul-apply-form-spec]]
// 골격 단계: 레이아웃·선택상태·상태배지·빈/상세 구조만. 실제 조회(getApplicationsByPhone)·OTP 인증·
// 수정/환불/증명서 액션은 제출 파이프라인(Task 5) 배선 후. 아래 MOCK 은 레이아웃 확인용 임시.

type ApplicationStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded'
const STATUS: Record<ApplicationStatus, { label: string; color: BadgeColor }> = {
  pending: { label: '입금 대기', color: 'amber' },
  paid: { label: '입금 확인', color: 'navy' },
  completed: { label: '연수 완료', color: 'emerald' },
  cancelled: { label: '신청취소', color: 'slate' },
  refunded: { label: '환불 완료', color: 'slate' },
}

// 표시 상태 — 추가입금 부족분(due)이 있으면 base 입금확인이어도 '입금대기(추가)'로 구분.
function statusView(app: MyApplicationRow): { label: string; color: BadgeColor } {
  if (app.due_amount > 0 && (app.status === 'paid' || app.status === 'completed')) {
    return { label: '입금대기(추가)', color: 'orange' }
  }
  return STATUS[app.status]
}

const won = (n: number) => n.toLocaleString('ko-KR') + '원'

// 요청 처리 현황 — 고객 노출 상태 라벨. 어드민 처리 결과가 마이페이지에 도달하는 유일 경로. [[requests-reorg-modification-restructure]]
const MOD_STATUS: Record<'pending' | 'completed' | 'rejected', { label: string; color: BadgeColor }> = {
  pending: { label: '접수됨 · 확인 중', color: 'amber' },
  completed: { label: '반영 완료', color: 'emerald' },
  rejected: { label: '반려', color: 'slate' },
}
const REFUND_STATUS: Record<'requested' | 'confirmed' | 'completed', { label: string; color: BadgeColor }> = {
  requested: { label: '접수됨 · 확인 중', color: 'amber' },
  confirmed: { label: '환불 확정', color: 'navy' },
  completed: { label: '환불 완료', color: 'emerald' },
}

// 텍스트 히어로 — 다른 페이지들과 동일한 중앙 인트로 문단. 데스크탑 전용(md:block):
// 모바일은 서브헤더(← 마이페이지)가 컨텍스트를 이미 주므로 생략(세로 공간·중복 방지).
function MyHero() {
  return (
    <p className="hidden px-4 pt-1 pb-7 text-center font-score text-[clamp(0.9375rem,3.4cqi,1.0625rem)] font-[300] leading-[1.85] text-[#4b5563] md:block">
      본인 확인 후 <span className="font-[500] text-[#1e3a5f]">신청 내역</span>을 조회하고,<br />
      정보 수정 · 환불 · 증명서 발급을 요청할 수 있습니다.
    </p>
  )
}

// 본인확인(방식 b, SMS 없음) — 게이트에서 이름+전화+생년월일(이미 수집한 값, 본인이 항상 아는 값) 입력 →
// Task5에서 /api 가 매칭·검증하고 opaque 세션토큰 발급. localStorage 엔 원문 PII 대신 세션(토큰+표시이름)만
// 저장해 같은 기기 재방문 시 자동 조회. 다른 기기 = 이름+전화+생년월일 재입력(분실 없음). [[application-plan-reference]]
interface Auth {
  name: string
  phone: string
  birth: string // YYMMDD (신청폼 birthFront 와 매칭)
}
interface Session {
  name: string
  token: string
}
const SESSION_KEY = 'pea:my:auth'

// 조회 게이트 — 이름 + 전화번호 + 생년월일로 본인확인(계획안 ④). SMS 없이 localStorage 기억.
function AuthGate({ onVerified, error, loading }: { onVerified: (v: Auth) => void; error: string | null; loading: boolean }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [birth, setBirth] = useState('')
  const ok = name.trim().length > 0 && phone.length >= 10 && birth.length === 6
  // 통일 규칙: 포커스에 하드 테두리 안 씀. 테두리 고정(#e5eaef), 포커스는 옅은 배경 틴트로만.
  const inputCls =
    'w-full rounded-[10px] border border-[#e5eaef] bg-white px-3.5 py-2.5 text-center font-score text-[16px] text-[#1f2937] placeholder:text-[#b6bcc4] transition-colors focus:bg-[#f7f9fb] focus:outline-none'
  return (
    <div className="pb-8 pt-5">
      <MyHero />
      <section className="px-4">
        <WhiteBox className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eef2f7]">
            <ShieldCheck size={26} className="text-[#1e3a5f]" />
          </div>
          <Text variant="card-title" as="h3">본인 확인</Text>
          <Text variant="sub" as="p" className="mt-2 text-[#6b7280]">신청 시 사용한 이름 · 휴대폰 번호 · 생년월일로<br />내 신청 내역을 조회합니다.</Text>
          <input className={`${inputCls} mt-5`} value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
          <input
            className={`${inputCls} mt-2`}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="01000000000 (- 없이 숫자만)"
            inputMode="numeric"
          />
          <input
            className={`${inputCls} mt-2`}
            value={birth}
            onChange={(e) => setBirth(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="생년월일 6자리 (YYMMDD)"
            inputMode="numeric"
          />
          {error && <p className="mt-3 rounded-[8px] bg-[#fbecea] px-3 py-2 font-score text-[13px] text-[#b4483a]">{error}</p>}
          <Button size="md" variant="primary" disabled={!ok || loading} onClick={() => onVerified({ name: name.trim(), phone, birth })} className="mt-3 w-full">
            <Smartphone size={15} className="mr-1.5" />
            {loading ? '조회 중…' : '조회하기'}
          </Button>
        </WhiteBox>
      </section>
    </div>
  )
}

// 신청 카드(마스터) — 버튼 래핑은 MasterDetailList 가 처리, 여기선 시각만.
function ApplicationCard(app: MyApplicationRow, selected: boolean) {
  const st = statusView(app)
  return (
    <WhiteBox className={`p-4 transition-shadow ${selected ? 'ring-2 ring-[#1e3a5f]/30' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <Text variant="caption" className="tabular-nums text-[#8a94a0]">{app.application_no}</Text>
        <Badge color={st.color} size="sm">{st.label}</Badge>
      </div>
      <Text variant="card-title" as="p" className="mt-1.5">{app.track_label}</Text>
      <Text variant="sub" as="p" className="mt-0.5 text-[#4b5563]">{app.period}</Text>
      <div className="mt-2 flex items-center justify-between border-t border-[#eef1f4] pt-2">
        <Text variant="caption" className="text-[#9ca3af]">{app.headcount}인 · {app.created_at} 신청</Text>
        <Text variant="num">{won(app.total_amount)}</Text>
      </div>
    </WhiteBox>
  )
}

// 상세 폼 입력 — 통일 규칙(포커스 하드 테두리 없이 배경 틴트). 입력 16px(iOS 확대 방지).
const fieldCls =
  'w-full rounded-[10px] border border-[#e5eaef] bg-white px-3.5 py-2.5 font-score text-[16px] text-[#1f2937] placeholder:text-[#b6bcc4] transition-colors focus:bg-[#f7f9fb] focus:outline-none'

// 참가자 후속입력 — 자율패키지 신청 후 대표가 참가자 성함·생년월일·강습·장비·(보험시)뒷자리를 대신 입력.
// 신청 단계를 단순 유지하기 위해 상세는 신청 후 채운다([[companion-detail-post-signup-fill]]).
// 두 경로: 대표 대신입력(/api/my/participant) + 셀프필 링크 복사(참가자 각자입력, /fill/[token]).
// 참가자별 렌탈 옵션 귀속(대표 배정) 로컬 선택.
type OptSel = { apparel: boolean; protector: boolean; goggle: boolean; glove: boolean; insuranceWanted: boolean }
const NAVY = '#1e3a5f'

function CompanionFill({ applicationId, token }: { applicationId: string; token: string }) {
  const [roster, setRoster] = useState<MyRosterParticipant[] | null>(null)
  const [rentalQty, setRentalQty] = useState<RentalQty | null>(null)
  const [assign, setAssign] = useState<Record<string, OptSel>>({})
  const [savingAssign, setSavingAssign] = useState(false)
  const [assignError, setAssignError] = useState<string | null>(null)
  const [assignSaved, setAssignSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [linkError, setLinkError] = useState<string | null>(null)

  const initAssign = (r: MyRosterParticipant[]) => {
    const m: Record<string, OptSel> = {}
    for (const p of r) m[p.id] = { apparel: p.apparel, protector: p.protector, goggle: p.goggle, glove: p.glove, insuranceWanted: p.insurance_wanted }
    return m
  }

  // 참가자별 개별 링크 — 각 링크는 본인 슬롯만 수정 가능. 대표가 각자에게 전달(단톡 등).
  const copyLink = async (participantId: string) => {
    setLinkError(null)
    setBusyId(participantId)
    try {
      const fillToken = await requestMyFillLink(token, applicationId, participantId)
      await navigator.clipboard.writeText(`${window.location.origin}/fill/${fillToken}`)
      setCopiedId(participantId)
      setTimeout(() => setCopiedId((c) => (c === participantId ? null : c)), 2500)
    } catch (e) {
      setLinkError(e instanceof Error ? e.message : '링크 복사에 실패했습니다.')
    } finally {
      setBusyId((b) => (b === participantId ? null : b))
    }
  }

  const load = async () => {
    setError(null)
    try {
      const r = await fetchMyRoster(token, applicationId)
      setRoster(r.roster)
      setRentalQty(r.rentalQty)
      setAssign(initAssign(r.roster))
    } catch (e) {
      setError(e instanceof Error ? e.message : '참가자 정보를 불러오지 못했습니다.')
      setRoster([])
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetchMyRoster(token, applicationId)
        if (!cancelled) {
          setRoster(r.roster)
          setRentalQty(r.rentalQty)
          setAssign(initAssign(r.roster))
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '참가자 정보를 불러오지 못했습니다.')
          setRoster([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, applicationId])

  // 옵션별 배정 합계(정합성 카운터).
  const counts: Record<RentalOptionKey, number> = { apparel: 0, protector: 0, goggle: 0, glove: 0 }
  for (const sel of Object.values(assign)) {
    for (const o of RENTAL_OPTIONS) if (sel[o.key]) counts[o.key]++
  }
  const hasRentals = !!rentalQty && RENTAL_OPTIONS.some((o) => rentalQty[o.key] > 0)

  const toggleOpt = (pid: string, key: RentalOptionKey) => {
    setAssign((prev) => {
      const cur = prev[pid]
      if (!cur) return prev
      // 켜는 방향에서 구매 수량 초과면 무시(초과 배정 차단).
      if (!cur[key] && rentalQty && counts[key] >= rentalQty[key]) return prev
      setAssignSaved(false)
      return { ...prev, [pid]: { ...cur, [key]: !cur[key] } }
    })
  }
  const toggleInsurance = (pid: string) => {
    setAssign((prev) => {
      const cur = prev[pid]
      if (!cur) return prev
      setAssignSaved(false)
      return { ...prev, [pid]: { ...cur, insuranceWanted: !cur.insuranceWanted } }
    })
  }

  const saveAssign = async () => {
    if (!roster) return
    setAssignError(null)
    setSavingAssign(true)
    try {
      const assignments: RentalAssignmentInput[] = roster.map((p) => ({ participantId: p.id, ...assign[p.id] }))
      await assignParticipantOptions(token, applicationId, assignments)
      setAssignSaved(true)
      await load() // 배정 반영 → 슬롯 사이즈 입력 대상 갱신
    } catch (e) {
      setAssignError(e instanceof Error ? e.message : '배정 저장 중 오류가 발생했습니다.')
    } finally {
      setSavingAssign(false)
    }
  }

  return (
    <div className="mt-4 rounded-[10px] border border-[#e5eaef] bg-[#f7f9fb] p-4">
      <Text variant="label" className="text-[#374151]">참가자 정보</Text>
      <Text variant="caption" as="p" className="mt-1 text-[#9ca3af]">
        참가자 성함 · 생년월일 · 강습 · 대여장비를 대표가 대신 입력하거나, 참가자별 입력 링크를 복사해 각자에게 전달하면 본인이 직접 입력할 수 있습니다. 각 링크는 본인 정보만 수정 가능합니다.
      </Text>

      {/* 렌탈·보험 배정 — 옵션 귀속·보험은 대표가 결정(잠금). 렌탈이 없어도 다인원이면 보험 배정을 위해 노출. */}
      {roster && rentalQty && (hasRentals || roster.length > 1) && (
        <div className="mt-3 rounded-[10px] border border-[#e5eaef] bg-white p-3">
          <Text variant="label" className="text-[#374151]">렌탈 · 보험 배정</Text>
          <Text variant="caption" as="p" className="mt-1 text-[#9ca3af]">
            옵션·보험을 참가자별로 배정하세요. 대표가 정하고(잠금) 사이즈는 각 참가자가 입력합니다. 렌탈 배정 합계는 구매 수량을 넘을 수 없습니다.
          </Text>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {RENTAL_OPTIONS.filter((o) => rentalQty[o.key] > 0).map((o) => {
              const done = counts[o.key] === rentalQty[o.key]
              return (
                <span key={o.key} className="rounded-[6px] px-2 py-1 font-score text-[12px] tabular-nums" style={{ background: done ? '#eaf4ec' : '#eef2f7', color: done ? '#2f803a' : '#4b5563' }}>
                  {o.label} {counts[o.key]}/{rentalQty[o.key]}
                </span>
              )
            })}
          </div>
          <div className="mt-3 space-y-2">
            {roster.map((p) => {
              const sel = assign[p.id]
              if (!sel) return null
              return (
                <div key={p.id} className="rounded-[9px] border border-[#eef1f4] px-3 py-2.5">
                  <div className="flex items-center gap-1.5">
                    <Text variant="caption" className="shrink-0 text-[#8a94a0]">{p.is_leader ? '대표' : `참가자 ${p.sort_order + 1}`}</Text>
                    <Text variant="sub" className="truncate text-[#374151]">{p.name}</Text>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {RENTAL_OPTIONS.filter((o) => rentalQty[o.key] > 0).map((o) => {
                      const on = sel[o.key]
                      const full = !on && counts[o.key] >= rentalQty[o.key]
                      return (
                        <button
                          key={o.key}
                          type="button"
                          onClick={() => toggleOpt(p.id, o.key)}
                          disabled={full}
                          className="rounded-[7px] border px-2.5 py-1 font-score text-[12.5px] transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                          style={{ borderColor: on ? NAVY : '#e5eaef', background: on ? NAVY : '#ffffff', color: on ? '#ffffff' : '#4b5563' }}
                        >
                          {o.label}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => toggleInsurance(p.id)}
                      className="rounded-[7px] border px-2.5 py-1 font-score text-[12.5px] transition-colors"
                      style={{ borderColor: sel.insuranceWanted ? '#0f5a3c' : '#e5eaef', background: sel.insuranceWanted ? '#eaf4ec' : '#ffffff', color: sel.insuranceWanted ? '#0f5a3c' : '#9ca3af' }}
                    >
                      보험
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          {assignError && <p className="mt-2 rounded-[8px] bg-[#fbecea] px-3 py-2 font-score text-[13px] text-[#b4483a]">{assignError}</p>}
          <button
            type="button"
            onClick={saveAssign}
            disabled={savingAssign}
            className="mt-3 w-full rounded-[10px] bg-[#1e3a5f] py-2.5 font-score text-[14px] font-[500] text-white transition-colors hover:bg-[#16304f] disabled:opacity-40"
          >
            {savingAssign ? '저장 중…' : assignSaved ? '배정 저장됨 ✓' : '배정 저장'}
          </button>
        </div>
      )}

      {linkError && <p className="mt-2 rounded-[8px] bg-[#fbecea] px-3 py-2 font-score text-[13px] text-[#b4483a]">{linkError}</p>}

      {roster === null ? (
        <Text variant="caption" as="p" className="mt-3 text-[#9ca3af]">참가자 정보를 불러오는 중…</Text>
      ) : error ? (
        <p className="mt-3 rounded-[8px] bg-[#fbecea] px-3 py-2 font-score text-[13px] text-[#b4483a]">{error}</p>
      ) : (
        <div className="mt-3 space-y-2">
          {roster.map((p) => (
            <ParticipantFillSlot
              key={p.id}
              part={p}
              open={openId === p.id}
              onToggle={() => setOpenId((o) => (o === p.id ? null : p.id))}
              onSave={(input) => submitMyParticipant(token, applicationId, p.id, input)}
              onSaved={() => {
                setOpenId(null)
                load()
              }}
              onCopyLink={p.is_leader ? undefined : () => copyLink(p.id)}
              copyState={busyId === p.id ? 'busy' : copiedId === p.id ? 'copied' : 'idle'}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// 수정요청 정형 폼 — 참가자별 항목 현재값→변경값(자유텍스트 폐기). 렌탈=직무만(자율 렌탈은 배정 매트릭스).
// 요금 영향(직무 렌탈)은 어드민 반영 시 부분환불/추가결제로 자동 라우팅. 회차 변경은 대상 아님(취소 후 재신청).
type ModFieldDef = { field: ModificationField; label: string; input: 'text' | 'gender' | 'lesson' | 'equipment' | 'rental'; only?: 'jikmu' | 'jayul' }
const MOD_FIELDS: ModFieldDef[] = [
  { field: 'name', label: '성함', input: 'text' },
  { field: 'phone', label: '연락처', input: 'text' },
  { field: 'birth_front', label: '생년월일(6자리)', input: 'text' },
  { field: 'gender', label: '성별', input: 'gender' },
  { field: 'lesson_level', label: '기초강습', input: 'lesson', only: 'jayul' },
  { field: 'equipment', label: '용품세트', input: 'equipment', only: 'jayul' },
  { field: 'rental_apparel', label: '렌탈·의류', input: 'rental', only: 'jikmu' },
  { field: 'rental_protector', label: '렌탈·보호대', input: 'rental', only: 'jikmu' },
  { field: 'rental_goggle', label: '렌탈·고글', input: 'rental', only: 'jikmu' },
  { field: 'rental_glove', label: '렌탈·장갑', input: 'rental', only: 'jikmu' },
]

function rawCurrent(p: MyRosterParticipant, f: ModificationField): string {
  switch (f) {
    case 'name': return p.name ?? ''
    case 'phone': return p.phone ?? ''
    case 'birth_front': return p.birth_front ?? ''
    case 'gender': return p.gender ?? ''
    case 'lesson_level': return p.lesson_level ?? ''
    case 'equipment': return p.equipment ?? ''
    case 'rental_apparel': return p.apparel ? 'true' : 'false'
    case 'rental_protector': return p.protector ? 'true' : 'false'
    case 'rental_goggle': return p.goggle ? 'true' : 'false'
    case 'rental_glove': return p.glove ? 'true' : 'false'
    default: return ''
  }
}
function readableValue(f: ModificationField, v: string): string {
  if (f === 'gender') return v === 'male' ? '남' : v === 'female' ? '여' : '(미지정)'
  if (f === 'lesson_level') return v ? lessonLevelLabel(v) : '(미지정)'
  if (f === 'equipment') return v ? equipmentLabel(v) : '(미지정)'
  if (f.startsWith('rental_')) return v === 'true' ? '신청' : '미신청'
  return v || '(미입력)'
}

function ModificationForm({ app, token, onDone }: { app: MyApplicationRow; token: string; onDone: () => void }) {
  const [roster, setRoster] = useState<MyRosterParticipant[] | null>(null)
  const [loadErr, setLoadErr] = useState<string | null>(null)
  const [pid, setPid] = useState('')
  const [edits, setEdits] = useState<Record<string, string>>({}) // `${pid}::${field}` = requested
  const [note, setNote] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let alive = true
    fetchMyRoster(token, app.id)
      .then((r) => { if (!alive) return; setRoster(r.roster); setPid(r.roster[0]?.id ?? '') })
      .catch((e) => alive && setLoadErr(e instanceof Error ? e.message : '참가자 정보를 불러오지 못했습니다.'))
    return () => { alive = false }
  }, [app.id, token])

  const fields = MOD_FIELDS.filter((f) => !f.only || f.only === app.kind)
  const part = roster?.find((p) => p.id === pid) ?? null
  const keyOf = (f: ModificationField) => `${pid}::${f}`
  const toggle = (f: ModificationField) =>
    setEdits((e) => {
      const k = keyOf(f)
      const next = { ...e }
      if (k in next) delete next[k]
      else next[k] = part ? rawCurrent(part, f) : ''
      return next
    })
  const setVal = (f: ModificationField, v: string) => setEdits((e) => ({ ...e, [keyOf(f)]: v }))

  const submit = async () => {
    setError(null)
    if (!roster) return
    const changes: ModificationChange[] = []
    for (const [k, requested] of Object.entries(edits)) {
      const [ppid, field] = k.split('::') as [string, ModificationField]
      const p = roster.find((x) => x.id === ppid)
      if (!p) continue
      const current = rawCurrent(p, field)
      if (requested === current) continue
      const def = MOD_FIELDS.find((d) => d.field === field)
      changes.push({ target: 'participant', participant_id: ppid, participant_name: p.name, field, label: def?.label ?? field, current, requested })
    }
    if (!changes.length) { setError('변경할 항목을 선택하고 값을 바꿔 주세요.'); return }
    setSubmitting(true)
    try {
      await submitMyRequest({ token, applicationId: app.id, type: 'modification', changes, userNote: note.trim() || undefined })
      onDone()
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청 처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="mt-3 rounded-[10px] border border-[#e5eaef] bg-white p-4">
      <Text variant="label" className="text-[#374151]">정보 수정 요청</Text>
      <Text variant="caption" as="p" className="mt-1 text-[#9ca3af]">변경할 항목만 체크해 새 값을 입력하세요. 담당자 확인 후 반영됩니다. (회차 변경은 취소 후 재신청)</Text>

      {loadErr && <p className="mt-2 rounded-[8px] bg-[#fbecea] px-3 py-2 font-score text-[13px] text-[#b4483a]">{loadErr}</p>}
      {!roster && !loadErr && <p className="mt-3 font-score text-[13px] text-[#9ca3af]">참가자 정보를 불러오는 중…</p>}

      {roster && part && (
        <>
          {roster.length > 1 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {roster.map((p, i) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPid(p.id)}
                  className={`rounded-[8px] px-3 py-1.5 font-score text-[13px] transition-colors ${pid === p.id ? 'bg-[#1e3a5f] text-white' : 'bg-[#eef1f4] text-[#4b5563]'}`}
                >
                  {p.is_leader ? '대표' : `참가자 ${i}`} · {p.name}
                </button>
              ))}
            </div>
          )}

          <div className="mt-3 space-y-2">
            {fields.map((def) => {
              const on = keyOf(def.field) in edits
              const requested = edits[keyOf(def.field)] ?? ''
              return (
                <div key={def.field} className="rounded-[9px] bg-[#f7f9fb] px-3 py-2.5">
                  <label className="flex cursor-pointer items-center gap-2">
                    <input type="checkbox" checked={on} onChange={() => toggle(def.field)} className="h-4 w-4 accent-[#1e3a5f]" />
                    <span className="font-score text-[13.5px] font-[500] text-[#374151]">{def.label}</span>
                    <span className="ml-auto font-score text-[12px] text-[#9ca3af]">현재: {readableValue(def.field, rawCurrent(part, def.field))}</span>
                  </label>
                  {on && (
                    <div className="mt-2">
                      {def.input === 'text' && (
                        <input value={requested} onChange={(e) => setVal(def.field, e.target.value)} className={fieldCls} placeholder="변경할 값" />
                      )}
                      {def.input === 'gender' && (
                        <select value={requested} onChange={(e) => setVal(def.field, e.target.value)} className={fieldCls}>
                          <option value="">선택</option>
                          <option value="male">남</option>
                          <option value="female">여</option>
                        </select>
                      )}
                      {def.input === 'lesson' && (
                        <select value={requested} onChange={(e) => setVal(def.field, e.target.value)} className={fieldCls}>
                          <option value="">선택 안 함</option>
                          {JAYUL_LESSONS.map((l) => <option key={l.key} value={l.key}>{l.label}</option>)}
                        </select>
                      )}
                      {def.input === 'equipment' && (
                        <select value={requested} onChange={(e) => setVal(def.field, e.target.value)} className={fieldCls}>
                          <option value="">선택 안 함</option>
                          {EQUIPMENT_TYPES.map((eo) => <option key={eo.key} value={eo.key}>{eo.label}</option>)}
                        </select>
                      )}
                      {def.input === 'rental' && (
                        <select value={requested} onChange={(e) => setVal(def.field, e.target.value)} className={fieldCls}>
                          <option value="false">미신청</option>
                          <option value="true">신청</option>
                        </select>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="추가 요청·특이사항 (선택)" className={`${fieldCls} mt-3 resize-y`} />
          {error && <p className="mt-2 rounded-[8px] bg-[#fbecea] px-3 py-2 font-score text-[13px] text-[#b4483a]">{error}</p>}
          <Button variant="primary" size="md" onClick={submit} disabled={submitting} className="mt-2 w-full">
            {submitting ? '접수 중…' : '수정 요청 접수'}
          </Button>
        </>
      )}
    </div>
  )
}

// 신청 상세(디테일) — 데스크탑 우측 페인 / 모바일 모달 공용. refundBody = site_contents refund_policy(어드민 편집).
// 수정요청·환불신청 = 토큰으로 소유권 검증 후 접수(/api/my/requests). 증명서는 준비 중.
function ApplicationDetail({ app, refundBody, token }: { app: MyApplicationRow; refundBody: string | null; token: string }) {
  const st = statusView(app)
  const [open, setOpen] = useState<null | 'modification' | 'refund' | 'payment'>(null)
  const [refundAccount, setRefundAccount] = useState('')
  const [reason, setReason] = useState('')
  const [paymentName, setPaymentName] = useState(app.payer_name ?? app.applicant_name)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState({ modification: false, refund: false, payment: false, due: false })
  const [dueError, setDueError] = useState<string | null>(null)

  // 추가입금 완료 신고 — 별도 폼 없이 단일 버튼. due_amount>0 건에만, 1회(어드민이 대조 후 소비).
  const submitDue = async () => {
    setDueError(null)
    setSubmitting(true)
    try {
      await submitMyRequest({ token, applicationId: app.id, type: 'due_payment' })
      setDone((d) => ({ ...d, due: true }))
    } catch (e) {
      setDueError(e instanceof Error ? e.message : '요청 처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  const rows: [string, string][] = [
    ['신청자', app.applicant_name],
    ['일정', app.period],
    ['인원', `${app.headcount}명`],
    ['신청일', app.created_at],
  ]

  const toggle = (k: 'modification' | 'refund' | 'payment') => {
    setError(null)
    setOpen((o) => (o === k ? null : k))
  }

  // 환불·입금확인만 여기서 처리. 수정요청은 정형 폼(ModificationForm)이 자체 제출.
  const submit = async (type: 'refund' | 'payment') => {
    setError(null)
    if (type === 'refund' && !refundAccount.trim()) {
      setError('환불 받으실 계좌를 입력해 주세요.')
      return
    }
    if (type === 'payment' && !paymentName.trim()) {
      setError('입금자 성명을 입력해 주세요.')
      return
    }
    setSubmitting(true)
    try {
      const body =
        type === 'refund'
          ? ({ token, applicationId: app.id, type, reason, refundAccount } as const)
          : ({ token, applicationId: app.id, type, payerName: paymentName } as const)
      await submitMyRequest(body)
      setDone((d) => ({ ...d, [type]: true }))
      setOpen(null)
      setRefundAccount('')
      setReason('')
    } catch (e) {
      setError(e instanceof Error ? e.message : '요청 처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Text variant="card-title" as="h3">{app.track_label}</Text>
        <Badge color={st.color}>{st.label}</Badge>
      </div>
      <Text variant="caption" as="p" className="mt-1 tabular-nums text-[#8a94a0]">{app.application_no}</Text>

      <dl className="mt-4 space-y-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <Text variant="sub" className="shrink-0 text-[#9ca3af]">{k}</Text>
            <Text variant="sub" className="text-right text-[#374151]">{v}</Text>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 border-t border-[#e5eaef] pt-2.5">
          <Text variant="card-title-sm">결제 금액</Text>
          <Text variant="num-lg">{won(app.total_amount)}</Text>
        </div>
      </dl>

      {/* 입금 확인 완료 — paid 건(추가입금 없을 때만). 배지만으론 약해 명시적 확인 노트로 안심시킴. */}
      {app.status === 'paid' && app.due_amount === 0 && (
        <div className="mt-4 flex items-start gap-2 rounded-[10px] border border-[#cfe6d5] bg-[#eaf4ec] px-4 py-3">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-[#2f803a]" />
          <Text variant="sub" className="text-[#2f803a]"><b>입금이 확인되었습니다.</b> 접수가 확정되었습니다.</Text>
        </div>
      )}

      {/* 추가입금 대기 — 옵션 변경으로 요금이 늘어 부족분 입금이 필요. 단순 입금대기와 구분. */}
      {app.due_amount > 0 && (
        <div className="mt-4 rounded-[10px] border border-[#e6cfa8] bg-[#fbf3e6] px-4 py-3">
          <Text variant="sub" className="text-[#8a5a1a]">
            <b>추가 입금이 필요합니다.</b> 옵션 변경으로 요금이 {won(app.due_amount)} 늘었습니다. 아래 계좌로 부족분을 입금해 주세요.
          </Text>
          {app.due_claimed || done.due ? (
            <Text variant="caption" as="p" className="mt-2 text-[#2f803a]">추가입금 완료 알림이 접수되었습니다. 담당자가 통장 대조 후 처리합니다.</Text>
          ) : (
            <>
              <Text variant="caption" as="p" className="mt-1 text-[#a07a3a]">입금하셨으면 아래 버튼을 눌러 주세요. 담당자에게 전달돼 대조 후 처리됩니다.</Text>
              {dueError && <p className="mt-2 rounded-[8px] bg-[#fbecea] px-3 py-2 font-score text-[13px] text-[#b4483a]">{dueError}</p>}
              <Button variant="primary" size="md" onClick={submitDue} disabled={submitting} className="mt-2 w-full">
                {submitting ? '접수 중…' : '추가입금 완료 알림'}
              </Button>
            </>
          )}
        </div>
      )}

      {/* 입금 확인 요청 — 입금대기 건에서만. 상태는 안 바뀌고 담당자 대조 대기 신호 + 입금자명 백업(1회). */}
      {app.status === 'pending' && (
        app.payment_claimed || done.payment ? (
          <div className="mt-4 rounded-[10px] border border-[#cfe6d5] bg-[#eaf4ec] px-4 py-3">
            <Text variant="sub" className="text-[#2f803a]">입금 확인 요청이 접수되었습니다. 담당자가 통장 대조 후 ‘입금 확인’으로 바꿉니다. 확인 전까지는 ‘입금 대기’로 표시되며, 영업일 기준 시간이 걸릴 수 있습니다.</Text>
          </div>
        ) : (
          <div className="mt-4 rounded-[10px] border border-[#e5eaef] bg-[#f7f9fb] p-4">
            <Text variant="label" className="text-[#374151]">입금을 완료하셨나요?</Text>
            <Text variant="caption" as="p" className="mt-1 text-[#9ca3af]">입금하셨으면 아래 ‘입금 확인 요청’을 눌러 주세요. 담당자에게 전달돼 통장 대조 후 ‘입금 확인’으로 바뀝니다. 요청하지 않으면 확인이 늦어질 수 있습니다.</Text>
            {open === 'payment' ? (
              <>
                <input className={`${fieldCls} mt-2`} value={paymentName} onChange={(e) => setPaymentName(e.target.value)} placeholder="입금자 성명" />
                <Text variant="caption" as="p" className="mt-1 text-[#9ca3af]">신청자명과 다르면 실제 입금하신 분 성함으로 적어주세요. 회계 대조에 사용됩니다.</Text>
                <Text variant="caption" as="p" className="mt-1 text-[#c0685a]">※ 실제로 입금하신 경우에만 요청해 주세요. 입금 내역이 확인되지 않으면 처리되지 않습니다.</Text>
                {error && <p className="mt-2 rounded-[8px] bg-[#fbecea] px-3 py-2 font-score text-[13px] text-[#b4483a]">{error}</p>}
                <Button variant="primary" size="md" onClick={() => submit('payment')} disabled={submitting} className="mt-2 w-full">
                  {submitting ? '접수 중…' : '입금 확인 요청'}
                </Button>
              </>
            ) : (
              <Button variant="primary" size="md" onClick={() => toggle('payment')} className="mt-2 w-full">
                입금 확인 요청
              </Button>
            )}
          </div>
        )
      )}

      {/* 요청 처리 현황 — 내가 넣은 수정·환불 요청의 처리 상태와 담당자 답변. 어드민 반영 결과 도달 경로. */}
      {(app.modifications.length > 0 || app.refunds.length > 0) && (
        <div className="mt-4 rounded-[10px] border border-[#e5eaef] bg-[#f7f9fb] p-4">
          <Text variant="label" className="text-[#374151]">요청 처리 현황</Text>
          <div className="mt-2 space-y-2">
            {app.modifications.map((m, i) => {
              const st = MOD_STATUS[m.status]
              return (
                <div key={`m${i}`} className="rounded-[9px] bg-white px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Text variant="caption" className="text-[#6b7280]">정보 수정요청</Text>
                    <Badge color={st.color} size="sm">{st.label}</Badge>
                    <Text variant="caption" className="ml-auto text-[#b6bcc4]">{m.created_at.slice(0, 10).replaceAll('-', '/')}</Text>
                  </div>
                  <Text variant="sub" as="p" className="mt-1 text-[#4b5563]">{m.changes_summary}</Text>
                  {m.admin_reply && (
                    <p className="mt-1.5 whitespace-pre-line rounded-[7px] bg-[#f3f6f9] px-2.5 py-2 font-score text-[12.5px] leading-relaxed text-[#4b5563]">{m.admin_reply}</p>
                  )}
                </div>
              )
            })}
            {app.refunds.map((f, i) => {
              const st = REFUND_STATUS[f.status]
              return (
                <div key={`f${i}`} className="rounded-[9px] bg-white px-3 py-2.5">
                  <div className="flex items-center gap-2">
                    <Text variant="caption" className="text-[#6b7280]">{f.origin === 'modification' ? '부분환불 (수정 반영)' : f.origin === 'admin' ? '환불 (담당자 처리)' : '환불 신청'}</Text>
                    <Badge color={st.color} size="sm">{st.label}</Badge>
                    <Text variant="caption" className="ml-auto text-[#b6bcc4]">{f.created_at.slice(0, 10).replaceAll('-', '/')}</Text>
                  </div>
                  {f.amount != null && f.amount > 0 && (
                    <Text variant="sub" as="p" className="mt-1 tabular-nums text-[#4b5563]">환불 금액 {won(f.amount)}</Text>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* 참가자 정보 — 자율패키지는 참가자 후속입력(대표 대신입력). 직무연수는 단독 신청이라 생략. */}
      {app.kind === 'jayul' && <CompanionFill applicationId={app.id} token={token} />}

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button variant="primary" size="sm" onClick={() => toggle('modification')} disabled={done.modification}>
          <Pencil size={13} className="mr-1" />{done.modification ? '요청됨' : '수정요청'}
        </Button>
        <Button variant="primary" size="sm" onClick={() => toggle('refund')} disabled={done.refund}>
          <RefreshCcw size={13} className="mr-1" />{done.refund ? '신청됨' : '환불신청'}
        </Button>
        <Button variant="primary" size="sm" disabled><FileText size={13} className="mr-1" />증명서</Button>
      </div>

      {/* 수정 요청 — 정형 폼(항목별 현재값→변경값). 차수 변경은 대상 아님(취소 후 재신청). */}
      {open === 'modification' && (
        <ModificationForm
          app={app}
          token={token}
          onDone={() => {
            setDone((d) => ({ ...d, modification: true }))
            setOpen(null)
          }}
        />
      )}

      {/* 환불 신청 폼 */}
      {open === 'refund' && (
        <div className="mt-3 rounded-[10px] border border-[#e5eaef] bg-white p-4">
          <Text variant="label" className="text-[#374151]">환불 신청</Text>
          <Text variant="caption" as="p" className="mt-1 text-[#9ca3af]">아래 환불 규정을 확인하신 뒤 신청해 주세요. 담당자 확인 후 처리됩니다.</Text>
          <input className={`${fieldCls} mt-2`} value={refundAccount} onChange={(e) => setRefundAccount(e.target.value)} placeholder="환불 계좌 (은행 · 예금주 · 계좌번호)" />
          <textarea className={`${fieldCls} mt-2 min-h-[70px] resize-y`} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="환불 사유 (선택)" />
          {error && <p className="mt-2 rounded-[8px] bg-[#fbecea] px-3 py-2 font-score text-[13px] text-[#b4483a]">{error}</p>}
          <Button variant="primary" size="md" onClick={() => submit('refund')} disabled={submitting} className="mt-2 w-full">
            {submitting ? '접수 중…' : '환불 신청 접수'}
          </Button>
        </div>
      )}

      {done.modification && <p className="mt-3 rounded-[8px] bg-[#eaf4ec] px-3 py-2 font-score text-[13px] text-[#2f803a]">수정 요청이 접수되었습니다. 담당자 확인 후 반영됩니다.</p>}
      {done.refund && <p className="mt-3 rounded-[8px] bg-[#eaf4ec] px-3 py-2 font-score text-[13px] text-[#2f803a]">환불 신청이 접수되었습니다. 담당자 확인 후 처리됩니다.</p>}
      <Text variant="caption" as="p" className="mt-2 text-center text-[#b6bcc4]">증명서 발급은 준비 중입니다.</Text>

      {/* 환불 규정 — site_contents(refund_policy) 실데이터. 환불신청 맥락에서 노출. */}
      <div className="mt-4 rounded-[10px] border border-[#e5eaef] bg-[#f7f9fb] p-4">
        <Text variant="label" className="text-[#374151]">환불 규정</Text>
        {refundBody ? (
          <div className="mt-1.5 space-y-1">
            {refundBody.split('/').map((line, i) => (
              <Text key={i} variant="sub" as="p" className="text-[#4b5563]">· {line.trim()}</Text>
            ))}
          </div>
        ) : (
          <Text variant="sub" as="p" className="mt-1.5 text-[#9ca3af]">환불 규정을 불러오는 중…</Text>
        )}
        <Text variant="caption" as="p" className="mt-2 text-[#9ca3af]">기준일은 연수 시작일이며, 자세한 사항은 1:1 문의 바랍니다.</Text>
      </div>
    </div>
  )
}

export default function MyPage() {
  const [session, setSession] = useState<Session | null>(null)
  const [authError, setAuthError] = useState<string | null>(null)
  const [verifying, setVerifying] = useState(false)
  const [apps, setApps] = useState<MyApplicationRow[] | null>(null)
  const [listError, setListError] = useState<string | null>(null)
  const refund = useQuery<SiteContent | null>(() => getSiteContent('refund_policy'), null)
  const refundBody = refund.data?.body ?? null

  // 같은 기기 재방문 시 localStorage 세션(토큰) 복원 → 자동 조회. 원문 PII 는 저장하지 않음.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY)
      if (raw) setSession(JSON.parse(raw) as Session)
    } catch {
      /* 손상된 값 무시 */
    }
  }, [])

  const clearSession = () => {
    setSession(null)
    setApps(null)
    try {
      window.localStorage.removeItem(SESSION_KEY)
    } catch {
      /* 무시 */
    }
  }

  // 세션(토큰) 확보 시 신청목록 조회. 토큰 만료(401)면 세션 해제 → 게이트 재노출.
  useEffect(() => {
    if (!session) {
      setApps(null)
      return
    }
    let cancelled = false
    setListError(null)
    setApps(null)
    ;(async () => {
      try {
        const res = await fetch('/api/my/applications', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: session.token }),
        })
        if (res.status === 401) {
          if (!cancelled) clearSession()
          return
        }
        const json = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(json.error || '조회 중 오류가 발생했습니다.')
        if (!cancelled) setApps((json.applications as MyApplicationRow[]) ?? [])
      } catch (e) {
        if (!cancelled) {
          setListError(e instanceof Error ? e.message : '조회 중 오류가 발생했습니다.')
          setApps([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [session])

  // 게이트 제출 — creds(이름+전화+생년월일)를 /api/my/verify 로 보내 서버가 대표 참가자와 매칭·검증 후
  // opaque 세션토큰 발급. 토큰은 사용자가 기억할 값이 아니며, 보관할 크리덴셜은 '신청번호'.
  const verify = async (creds: Auth) => {
    setAuthError(null)
    setVerifying(true)
    try {
      const res = await fetch('/api/my/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creds),
      })
      const json = await res.json().catch(() => ({}))
      if (!res.ok || !json.token) throw new Error(json.error || '조회에 실패했습니다.')
      const s: Session = { name: json.name as string, token: json.token as string }
      setSession(s)
      try {
        window.localStorage.setItem(SESSION_KEY, JSON.stringify(s))
      } catch {
        /* 저장 실패 무시 */
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : '조회에 실패했습니다.')
    } finally {
      setVerifying(false)
    }
  }

  // 1) 조회 게이트
  if (!session) {
    return (
      <AppShell
        main={<AuthGate onVerified={verify} error={authError} loading={verifying} />}
        extended={
          <div>
            <ExtendedHeader title="마이페이지" eyebrow="MY PAGE" />
            <SectionTitle title="이용 안내" />
            <WhiteBox className="p-6">
              <Text variant="body" className="text-[#4b5563]">본인 확인 후 신청 내역 조회 · 정보 수정요청 · 환불 신청 · 증명서 발급을 이용할 수 있습니다.</Text>
            </WhiteBox>
          </div>
        }
      />
    )
  }

  // 2) 조회 중(토큰 확보~목록 도착)
  if (apps === null) {
    return (
      <AppShell
        main={
          <div className="pb-8 pt-10 md:pt-5">
            <MyHero />
            <div className="px-4"><LoadingState /></div>
          </div>
        }
        extended={<div><ExtendedHeader title="마이페이지" eyebrow="MY PAGE" /><SectionTitle title="신청 상세" /></div>}
      />
    )
  }

  // 3) 신청목록 마스터-디테일 (실데이터, 토큰 조회 결과)
  return (
    <MasterDetailProvider>
      <AppShell
        main={
          <div className="pb-8 pt-10 md:pt-5">
            <MyHero />
            <div className="flex items-center justify-between gap-2 px-4 pb-1">
              <Text variant="sub" className="text-[#6b7280]">{session.name} 님의 신청 내역 {apps.length}건</Text>
              <button type="button" onClick={clearSession} className="shrink-0 font-score text-[12px] text-[#9ca3af] underline underline-offset-2">다른 정보로 조회</button>
            </div>
            {listError && (
              <div className="px-4 pb-2">
                <p className="rounded-[8px] bg-[#fbecea] px-3 py-2 font-score text-[13px] text-[#b4483a]">{listError}</p>
              </div>
            )}
            <MasterDetailList
              items={apps}
              getKey={(a) => a.id}
              renderCard={(a, { selected }) => ApplicationCard(a, selected)}
              emptyLabel="조회된 신청 내역이 없습니다."
            />
            <MasterDetailDetail items={apps} getKey={(a) => a.id} renderDetail={(a) => <ApplicationDetail key={a.id} app={a} refundBody={refundBody} token={session.token} />} variant="mobile" />
          </div>
        }
        extended={
          <div>
            <ExtendedHeader title="마이페이지" eyebrow="MY PAGE" />
            <SectionTitle title="신청 상세" />
            <WhiteBox className="p-6">
              <MasterDetailDetail items={apps} getKey={(a) => a.id} renderDetail={(a) => <ApplicationDetail key={a.id} app={a} refundBody={refundBody} token={session.token} />} variant="desktop" />
            </WhiteBox>
          </div>
        }
      />
    </MasterDetailProvider>
  )
}
