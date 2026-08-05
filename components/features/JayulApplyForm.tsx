'use client'

import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import FormSectionTitle from '@/components/common/FormSectionTitle'
import Text from '@/components/common/Text'
import { LoadingState } from '@/components/common/StateView'
import { useQuery } from '@/lib/useQuery'
import { getSessions, getPriceItems, getSessionPriceOverrides, getSessionAvailability, type SessionAvailability } from '@/lib/queries'
import { applyOverrides, rentalPriceItem, ONE_NIGHT_VARIANT, PRIVATE_LESSON_KEY } from '@/lib/pricing'
import { formatPeriod } from '@/lib/display'
import { submitApplication } from '@/lib/applyClient'
import ApplyComplete from '@/components/features/ApplyComplete'
import { JAYUL_LESSONS, EQUIPMENT_TYPES, lessonSlotsFor, PRIVATE_LESSON_MAX } from '@/lib/lessonOptions'
import { Field, ApplicantFields, RouteSelect, PrivacyConsentBox, ConsentChecks, SummaryActions, SeatsLeft, WaitlistNotice, won, inputCls } from './apply/shared'
import type { SessionWithCourse, PriceItem, SessionPriceOverride, ScheduleType, CashReceiptType } from '@/lib/types'
import type { JayulPayload } from '@/lib/applicationTypes'

// 자율패키지 신청 폼(상세) — /application 자율 트랙(데스크탑 우 페인 / 모바일 모달). [[jayul-apply-form-spec]]
// 원칙: 무통장 1회 완납 → 금액 바꾸는 선택(인원·렌탈수량)은 신청 시 확정, 금액무관 정보(사이즈·명단)는 어드민 후속.
// 대표 단독 신청 — 참가자 개별 캡처 없음(비대표 조회 드롭). 보험은 폼에서 제외(비용 미확정 → 발생 시 추가입금).
// 가격: 세션 schedule_type이 변형 결정 → pkg_{변형}_{인원} 묶음가(price_items pkg_price) + 렌탈 수량×정액.

const GREEN = '#2f803a'
const DRAFT_KEY = 'pea:draft:application:jayul'
const MAX_HEADCOUNT = 6

// 자율 변형 라벨(세션 schedule_type → 표시명). jikmu 제외.
const VARIANT_LABEL: Record<Exclude<ScheduleType, 'jikmu'>, string> = {
  weekday_2n: '주중 2박',
  weekend_2n: '주말 2박',
  weekend_1n: '주말 1박',
}

// 유형 먼저 선택 → 해당 유형의 차수 목록. 표시 순서·기간.
type JayulVariant = Exclude<ScheduleType, 'jikmu'>
const VARIANTS: { key: JayulVariant; label: string; spec: string }[] = [
  { key: 'weekend_2n', label: '주말 2박', spec: '2박 3일' },
  { key: 'weekday_2n', label: '주중 2박', spec: '2박 3일' },
  { key: 'weekend_1n', label: '주말 1박', spec: '1박 2일' },
]

// 렌탈 항목 — item_key = price_items(rental) 매칭. 수량형(0~인원).
const RENTAL_KEYS = ['apparel', 'goggle', 'protector', 'glove'] as const
type RentalKey = (typeof RENTAL_KEYS)[number]
// 렌탈 사이즈·귀속은 신청 단계에서 받지 않는다 — 수량·비용만. 신청 후 마이페이지 대표 배정에서 수집. [[companion-detail-post-signup-fill]]

interface JayulForm {
  variant: '' | JayulVariant // 패키지 유형(선행 선택) → 차수·가격 결정
  sessionId: string
  headcount: number // 1~6 → pkg 묶음가
  // 대표자(결제·연락 창구) — 직무폼 기본정보 재활용(보험 제외)
  name: string
  gender: '' | 'male' | 'female'
  phone: string
  birthFront: string
  lessonClass: string // 대표 기초강습(jayul_ski/jayul_board/jayul_freeride)
  equipment: '' | 'ski' | 'board' // 대표 대여 장비 세트
  rentals: Record<RentalKey, number> // 항목별 수량(비용만). 사이즈·귀속은 신청 후 대표 배정
  // 개별(추가) 강습 — 시간대별 횟수(중복 = 숫자). 합계가 곧 수량이라 별도 수량 입력이 없다.
  // 그룹 체험 강습 1회는 패키지 기본 포함이라 과금 대상 아님.
  lessonSlotQty: Record<string, number>
  repInsurance: boolean // 대표 본인 보험 희망
  note: string // 기타 요청사항(자유기술)
  // 추가 정보·확인·동의(직무폼과 공통 — 내일 컴포넌트화)
  payerDiffers: boolean // 입금자≠대표
  payerName: string // 입금자명
  cashReceiptType: CashReceiptType // 현금영수증 발급유형(소득공제/지출증빙/발급안함)
  cashReceiptBizno: string // 지출증빙 시 사업자번호
  routes: string[] // 알게 된 경로(다중)
  confirmChecked: boolean // 신청·입금자명 일치 확인(필수)
  privacyConsent: boolean // 개인정보·촬영 동의(필수)
  marketingOptIn: boolean // 프로그램 연락 수신(선택)
}

const EMPTY: JayulForm = {
  variant: '', sessionId: '', headcount: 1, name: '', gender: '', phone: '', birthFront: '',
  lessonClass: '', equipment: '',
  rentals: { apparel: 0, goggle: 0, protector: 0, glove: 0 },
  lessonSlotQty: {},
  repInsurance: false,
  note: '',
  payerDiffers: false, payerName: '',
  cashReceiptType: 'personal', cashReceiptBizno: '', routes: [],
  confirmChecked: false, privacyConsent: false, marketingOptIn: false,
}

// 라디오형 선택 — 체크 + 배경 틴트(자율=그린). compact = 좁은 그리드용 축약.
function OptionRow({
  selected, onClick, compact, children,
}: { selected: boolean; onClick: () => void; compact?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center rounded-[10px] border border-[#e5eaef] text-left font-score text-[clamp(0.8125rem,3.4cqi,0.875rem)] transition-colors ${
        compact ? 'justify-center gap-1.5 whitespace-nowrap px-2 py-2.5 md:gap-2.5 md:px-3.5' : 'gap-2.5 px-3.5 py-2.5'
      }`}
      style={{ background: selected ? GREEN + '12' : '#ffffff', color: selected ? GREEN : '#4b5563' }}
    >
      {!compact && (
        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: selected ? GREEN : '#cbd2da' }}>
          {selected && <span className="h-2 w-2 rounded-full" style={{ background: GREEN }} />}
        </span>
      )}
      <span className={compact ? 'min-w-0' : 'min-w-0 flex-1'}>{children}</span>
    </button>
  )
}

// 수량형(렌탈·추가강습) — 라벨 + 단가 + 스텝퍼(−/값/+). 0이면 회색, ≥1이면 그린.
// unitLabel: 렌탈은 '개당', 강습은 '회당'.
function QtyRow({
  label, unit, qty, max, onChange, unitLabel = '개당',
}: { label: string; unit: number; qty: number; max: number; onChange: (n: number) => void; unitLabel?: string }) {
  const on = qty > 0
  return (
    <div
      className="flex items-center gap-2.5 rounded-[10px] border border-[#e5eaef] px-3.5 py-2 font-score text-[clamp(0.75rem,2.8cqi,0.875rem)] transition-colors"
      style={{ background: on ? GREEN + '12' : '#ffffff', color: on ? GREEN : '#4b5563' }}
    >
      {/* 라벨+개당가를 한 블록으로 묶어 flex-wrap — 좁으면 개당가가 라벨 아래로, 라벨은 어절 단위(break-keep)로 줄바꿈(글자 단위 고아 방지). */}
      <div className="flex min-w-0 flex-1 flex-wrap items-baseline gap-x-2 gap-y-0.5">
        <span className="break-keep">{label}</span>
        <span className="shrink-0 font-score text-[clamp(0.71875rem,3.08cqi,0.8125rem)] tabular-nums" style={{ color: on ? GREEN : '#8a94a0' }}>
          {unitLabel} {won(unit)}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={`${label} 수량 감소`}
          onClick={() => onChange(Math.max(0, qty - 1))}
          disabled={qty <= 0}
          className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#e5eaef] bg-white text-[#4b5563] transition-colors hover:bg-[#f2f5f9] disabled:opacity-40"
        >
          <Minus size={14} />
        </button>
        <span className="w-6 text-center font-score text-[15px] tabular-nums" style={{ color: on ? GREEN : '#4b5563' }}>{qty}</span>
        <button
          type="button"
          aria-label={`${label} 수량 증가`}
          onClick={() => onChange(Math.min(max, qty + 1))}
          disabled={qty >= max}
          className="flex h-7 w-7 items-center justify-center rounded-[8px] border border-[#e5eaef] bg-white text-[#4b5563] transition-colors hover:bg-[#f2f5f9] disabled:opacity-40"
        >
          <Plus size={14} />
        </button>
      </div>
    </div>
  )
}

export default function JayulApplyForm() {
  const sessions = useQuery<SessionWithCourse[]>(getSessions, [])
  const availability = useQuery<SessionAvailability[]>(getSessionAvailability, [])
  const availById = useMemo(() => {
    const m: Record<string, SessionAvailability> = {}
    for (const a of availability.data ?? []) m[a.session_id] = a
    return m
  }, [availability.data])
  const prices = useQuery<PriceItem[]>(getPriceItems, [])
  const overrides = useQuery<SessionPriceOverride[]>(getSessionPriceOverrides, [])
  const [form, setForm] = useState<JayulForm>(EMPTY)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [resultNo, setResultNo] = useState<string | null>(null)
  const [resultWaitlisted, setResultWaitlisted] = useState(false)
  const [waitlistAck, setWaitlistAck] = useState(false)

  // 선택 차수가 정원 마감인지(잔여≤0) — 집계 확정된 경우에만. 마감이면 예비 고지·동의 요구.
  const selectedAvail = form.sessionId ? availById[form.sessionId] : undefined
  const selectedFull = selectedAvail != null && selectedAvail.remaining <= 0

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(DRAFT_KEY) : null
    if (raw) {
      try {
        const p = JSON.parse(raw) as Partial<JayulForm>
        setForm({ ...EMPTY, ...p, rentals: { ...EMPTY.rentals, ...(p.rentals ?? {}) } })
      } catch {
        /* 손상된 드래프트 무시 */
      }
    }
  }, [])

  // 선택된 유형의 차수만 — 유형 미선택이면 빈 목록.
  const variantSessions = useMemo(
    () => (form.variant ? (sessions.data ?? []).filter((s) => s.schedule_type === form.variant) : []),
    [sessions.data, form.variant],
  )

  // 선택 차수의 오버라이드를 얹은 '유효가'(기본가 ▸ 차수별 금액). 차수 미선택 시 기본가 그대로.
  const effectivePrices = useMemo(() => {
    if (!form.sessionId) return prices.data
    return applyOverrides(prices.data, overrides.data.filter((o) => o.session_id === form.sessionId))
  }, [prices.data, overrides.data, form.sessionId])

  const itemBy = useMemo(() => {
    const m: Record<string, PriceItem> = {}
    for (const p of effectivePrices) m[p.item_key] = p
    return m
  }, [effectivePrices])

  // pkg 묶음가 — pkg_{변형}_{인원}. 유형 미선택이면 0.
  const pkgAmount = form.variant ? itemBy[`pkg_${form.variant}_${form.headcount}`]?.amount ?? 0 : 0

  // 개별 강습 — 시간대별 횟수 합계 = 총 수량. 제출 시엔 횟수만큼 반복된 슬롯 배열로 펼친다.
  const lessonTotalQty = useMemo(
    () => Object.values(form.lessonSlotQty).reduce((s, n) => s + n, 0),
    [form.lessonSlotQty],
  )
  const lessonSlotList = useMemo(() => {
    const out: string[] = []
    for (const [key, n] of Object.entries(form.lessonSlotQty)) for (let i = 0; i < n; i++) out.push(key)
    return out
  }, [form.lessonSlotQty])

  // 렌탈 단가 — 주말1박은 1박 요금(_1n)으로 분기. 서버 재계산(lib/pricing)과 동일 폴백 규칙 공유.
  const oneNight = form.variant === ONE_NIGHT_VARIANT
  const rentalItem = (key: string) => rentalPriceItem(itemBy, key, oneNight)

  // 실시간 합계 라인아이템 — 유형·차수 선택 시부터 계상.
  const lines = useMemo(() => {
    const out: { label: string; amount: number }[] = []
    if (!form.variant || !form.sessionId) return out
    out.push({ label: `${VARIANT_LABEL[form.variant]} · ${form.headcount}인 패키지`, amount: pkgAmount })
    for (const key of RENTAL_KEYS) {
      const qty = form.rentals[key]
      const priced = rentalPriceItem(itemBy, key, form.variant === ONE_NIGHT_VARIANT)
      if (qty > 0 && priced) {
        out.push({ label: `${(itemBy[key] ?? priced).label} ×${qty}`, amount: priced.amount * qty })
      }
    }
    const lessonItem = itemBy[PRIVATE_LESSON_KEY]
    if (lessonTotalQty > 0 && lessonItem) {
      out.push({ label: `${lessonItem.label} ×${lessonTotalQty}`, amount: lessonItem.amount * lessonTotalQty })
    }
    return out
  }, [form.variant, form.sessionId, form.headcount, form.rentals, lessonTotalQty, pkgAmount, itemBy])
  const total = lines.reduce((s, l) => s + l.amount, 0)

  const set = <K extends keyof JayulForm>(k: K, v: JayulForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setSaved(false)
  }
  // 기본정보 공통 필드셋(ApplicantFields)용 patch 세터.
  const patch = (p: Partial<JayulForm>) => {
    setForm((f) => ({ ...f, ...p }))
    setSaved(false)
  }
  // 유형 변경 시 선택 차수 초기화(차수는 유형에 종속) + 개별 강습 시간대 초기화
  // (1박↔2박은 고를 수 있는 시간대가 달라 이전 선택이 그대로 남으면 안 됨).
  const setVariant = (v: JayulVariant) => {
    setForm((f) => (f.variant === v ? f : { ...f, variant: v, sessionId: '', lessonSlotQty: {} }))
    setSaved(false)
  }
  // 시간대별 강습 횟수 — 합계가 곧 총 수량. 상한(PRIVATE_LESSON_MAX)은 합계 기준으로 건다.
  const setLessonSlotQty = (key: string, n: number) => {
    setForm((f) => {
      const others = Object.entries(f.lessonSlotQty).reduce((s, [k, v]) => (k === key ? s : s + v), 0)
      const capped = Math.max(0, Math.min(n, PRIVATE_LESSON_MAX - others))
      return { ...f, lessonSlotQty: { ...f.lessonSlotQty, [key]: capped } }
    })
    setSaved(false)
  }
  // 인원 변경 → 렌탈 수량 클램프(인원 초과 방지). 동반 명단은 신청폼에서 안 받음.
  const setHeadcount = (n: number) => {
    setForm((f) => {
      const rentals = { ...f.rentals }
      for (const key of RENTAL_KEYS) rentals[key] = Math.min(rentals[key], n)
      return { ...f, headcount: n, rentals }
    })
    setSaved(false)
  }
  // 렌탈 수량 변경 — 사이즈·귀속은 신청 후 대표 배정 단계에서 참가자별로 수집(신청 단계는 수량·비용만).
  const setRental = (key: RentalKey, n: number) => {
    setForm((f) => ({ ...f, rentals: { ...f.rentals, [key]: n } }))
    setSaved(false)
  }
  const togglePayerDiffers = (v: boolean) => {
    setForm((f) => ({ ...f, payerDiffers: v, payerName: v ? f.payerName : '' }))
    setSaved(false)
  }
  const toggleRoute = (r: string) => {
    setForm((f) => ({ ...f, routes: f.routes.includes(r) ? f.routes.filter((x) => x !== r) : [...f.routes, r] }))
    setSaved(false)
  }

  const saveDraft = () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    setSaved(true)
  }

  const submit = async () => {
    setSubmitError(null)
    const a = form
    const err =
      !a.variant ? '패키지 유형을 선택해 주세요.'
      : !a.sessionId ? '참가 차수를 선택해 주세요.'
      : !a.name.trim() ? '대표 신청자 성함을 입력해 주세요.'
      : !a.gender ? '성별을 선택해 주세요.'
      : a.phone.length < 10 ? '연락처를 정확히 입력해 주세요.'
      : a.birthFront.length !== 6 ? '생년월일 6자리를 입력해 주세요.'
      : !a.lessonClass ? '기초 단체 강습을 선택해 주세요.'
      : !a.equipment ? '대여 장비를 선택해 주세요.'
      : a.cashReceiptType === 'business' && a.cashReceiptBizno.length !== 10 ? '현금영수증 지출증빙용 사업자등록번호 10자리를 입력해 주세요.'
      : !a.privacyConsent || !a.confirmChecked ? '필수 동의 항목을 확인해 주세요.'
      : selectedFull && !waitlistAck ? '정원이 마감된 차수입니다. 예비(대기) 신청 확인에 동의해 주세요.'
      : null
    if (err) {
      setSubmitError(err)
      return
    }

    const payload: JayulPayload = {
      kind: 'jayul',
      sessionId: a.sessionId,
      variant: a.variant,
      headcount: a.headcount,
      applicant: { name: a.name.trim(), gender: a.gender, phone: a.phone, birthFront: a.birthFront },
      lessonClass: a.lessonClass,
      equipment: a.equipment,
      privateLesson: { qty: lessonTotalQty, slots: lessonSlotList },
      rentals: a.rentals,
      repInsurance: a.repInsurance,
      note: a.note,
      payerDiffers: a.payerDiffers,
      payerName: a.payerName,
      cashReceiptType: a.cashReceiptType,
      cashReceiptBizno: a.cashReceiptType === 'business' ? a.cashReceiptBizno : '',
      routes: a.routes,
      privacyConsent: a.privacyConsent,
      marketingOptIn: a.marketingOptIn,
    }
    setSubmitting(true)
    try {
      const { application_no, waitlisted } = await submitApplication(payload)
      window.localStorage.removeItem(DRAFT_KEY)
      setResultWaitlisted(waitlisted)
      setResultNo(application_no)
      window.scrollTo({ top: 0 })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '신청 처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (resultNo) return <ApplyComplete applicationNo={resultNo} accent={GREEN} waitlisted={resultWaitlisted} amount={total} />

  return (
    <div>
      <FormSectionTitle title="일정 · 인원" />

      <Field label="패키지 유형" required>
        <div className="grid grid-cols-3 gap-2">
          {VARIANTS.map((v) => {
            const on = form.variant === v.key
            return (
              <button
                key={v.key}
                type="button"
                onClick={() => setVariant(v.key)}
                aria-pressed={on}
                className="flex flex-col items-center gap-0.5 rounded-[10px] border border-[#e5eaef] px-2 py-2.5 text-center transition-colors"
                style={{ background: on ? GREEN + '12' : '#ffffff', color: on ? GREEN : '#4b5563' }}
              >
                <span className="font-score text-[clamp(0.8125rem,3.4cqi,0.9375rem)] font-[500]">{v.label}</span>
                <span className="font-score text-[clamp(0.6875rem,2.9cqi,0.75rem)]" style={{ color: on ? GREEN : '#9ca3af' }}>{v.spec}</span>
              </button>
            )
          })}
        </div>
      </Field>

      {form.variant && (
        sessions.loading ? (
          <LoadingState />
        ) : (
          <Field label="참가 차수" required>
            <div className="space-y-2">
              {variantSessions.length === 0 ? (
                <Text variant="sub" className="text-[#9ca3af]">개설된 {VARIANT_LABEL[form.variant]} 차수가 없습니다.</Text>
              ) : (
                variantSessions.map((s) => (
                  <OptionRow key={s.id} selected={form.sessionId === s.id} onClick={() => set('sessionId', s.id)}>
                    <span className="flex w-full items-start justify-between gap-2">
                      <span className="min-w-0">
                        <span className="block tabular-nums font-[500] md:inline">{formatPeriod(s.starts_on, s.ends_on, s.nights)}</span>
                        <span className="mt-0.5 block text-[clamp(0.71875rem,3.08cqi,0.75rem)] text-[#8a94a0] md:mt-0 md:ml-1.5 md:inline">{s.label}</span>
                      </span>
                      <SeatsLeft avail={availById[s.id]} />
                    </span>
                  </OptionRow>
                ))
              )}
            </div>
            {selectedFull && <WaitlistNotice checked={waitlistAck} onChange={setWaitlistAck} />}
          </Field>
        )
      )}

      <Field label="참가 인원" required hint="1~6인 패키지. 인원에 따라 숙박 평형(1~4인 22평 · 5~6인 33평)과 금액이 정해집니다.">
        <div className="grid grid-cols-6 gap-2">
          {Array.from({ length: MAX_HEADCOUNT }, (_, i) => i + 1).map((n) => (
            <OptionRow key={n} compact selected={form.headcount === n} onClick={() => setHeadcount(n)}>{n}인</OptionRow>
          ))}
        </div>
      </Field>

      <div className="mt-10">
        <FormSectionTitle title="대표 신청자 정보" />

        <ApplicantFields
          value={form}
          onChange={patch}
          accent={GREEN}
          namePlaceholder="대표 신청자 성함"
          phoneHint="신청 관련 안내가 이 번호로 전달됩니다."
        />
      </div>

      <div className="mt-10">
        <FormSectionTitle title="강습 · 대여장비" />
        <Field label="기초 단체 강습" required hint="대표 신청자 기준입니다. 동반 참가자는 신청 후 개별 입력합니다.">
          <div className="space-y-2">
            {JAYUL_LESSONS.map((l) => (
              <OptionRow key={l.key} selected={form.lessonClass === l.key} onClick={() => set('lessonClass', l.key)}>
                <span className="block">{l.label}</span>
                <span className="mt-0.5 block text-[12px] font-[300] text-[#8a94a0]">{l.goal}</span>
              </OptionRow>
            ))}
          </div>
        </Field>
        {/* 그룹 체험 강습 — 기본 포함이라 고를 게 없지만, 기초 단체 강습과 같은 층위의 '항목'으로 보여야
            "무엇이 포함되고 무엇을 더 살 수 있는지"가 한눈에 잡힌다(안내 문구로 흘리지 않는다). */}
        <Field label="그룹 체험 강습">
          <div
            className="flex items-center gap-2.5 rounded-[10px] border border-[#e5eaef] px-3.5 py-2.5 font-score text-[clamp(0.8125rem,3.4cqi,0.875rem)]"
            style={{ background: GREEN + '12', color: GREEN }}
          >
            {/* 선택 표식은 기초 단체 강습(OptionRow)과 동일한 라디오 — 같은 층위로 읽히게. 조작만 불가. */}
            <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: GREEN }}>
              <span className="h-2 w-2 rounded-full" style={{ background: GREEN }} />
            </span>
            <span className="min-w-0 flex-1">그룹 체험 강습 1회</span>
            <span className="shrink-0 rounded-[6px] bg-white/70 px-2 py-0.5 text-[clamp(0.71875rem,3.08cqi,0.75rem)] font-[500]">기본 포함</span>
          </div>
          <Text variant="sub" as="p" className="mt-1.5 text-[#8a94a0]">입문자 기준으로 운영되며 추가 비용이 없습니다.</Text>
        </Field>

        {/* 추가(개별) 강습 — 시간대별 횟수 카운터(렌탈 QtyRow 재사용). 같은 시간대 중복은 숫자로 표현하고,
            합계가 곧 총 수량이라 별도 수량 입력이 없다(수량≠시간대수 불일치 자체가 생기지 않음).
            선택 가능한 시간대는 박수에 종속 — 1박 2종 / 2박 5종. 유형 미선택 시엔 안내만. */}
        {itemBy[PRIVATE_LESSON_KEY] && (
          <Field
            label="추가 강습 (선택)"
            hint={`더 필요하시면 시간대별 횟수를 선택하세요. 같은 시간대를 여러 번 고를 수 있으며, 최대 ${PRIVATE_LESSON_MAX}회까지 가능합니다.`}
          >
            {!form.variant ? (
              <Text variant="sub" as="p" className="text-[#8a94a0]">패키지 유형을 먼저 선택하시면 강습 시간대가 표시됩니다.</Text>
            ) : (
              <div className="space-y-2">
                {lessonSlotsFor(form.variant).map((s) => (
                  <QtyRow
                    key={s.key}
                    label={s.label}
                    unit={itemBy[PRIVATE_LESSON_KEY].amount}
                    qty={form.lessonSlotQty[s.key] ?? 0}
                    max={PRIVATE_LESSON_MAX}
                    onChange={(n) => setLessonSlotQty(s.key, n)}
                    unitLabel="회당"
                  />
                ))}
              </div>
            )}
            {lessonTotalQty > 0 && (
              <Text variant="sub" as="p" className="mt-2 tabular-nums" color={GREEN}>
                총 {lessonTotalQty}회 · {won(itemBy[PRIVATE_LESSON_KEY].amount * lessonTotalQty)}
              </Text>
            )}
          </Field>
        )}
        <Field label="대여 장비" required hint="사용할 장비 세트를 선택하세요.">
          <div className="grid grid-cols-2 gap-2">
            {EQUIPMENT_TYPES.map((eq) => (
              <OptionRow key={eq.key} selected={form.equipment === eq.key} onClick={() => set('equipment', eq.key as 'ski' | 'board')}>
                <span className="block">{eq.label}</span>
                <span className="mt-0.5 block text-[11.5px] font-[300] text-[#8a94a0]">{eq.detail}</span>
              </OptionRow>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-10">
        <FormSectionTitle title="렌탈 (선택)" />
        <Field label="렌탈 장비" hint="필요한 수량을 선택하세요. 사이즈는 신청 후 마이페이지에서 참가자별로 배정·입력합니다.">
          <div className="space-y-2">
            {RENTAL_KEYS.map((key) => {
              const item = itemBy[key]
              const priced = rentalItem(key) // 단가만 박수 분기(라벨은 기본 항목 것 유지)
              if (!item || !priced) return null
              return (
                <QtyRow
                  key={key}
                  label={item.label}
                  unit={priced.amount}
                  qty={form.rentals[key]}
                  max={form.headcount}
                  onChange={(n) => setRental(key, n)}
                />
              )
            })}
          </div>
        </Field>
      </div>

      <div className="mt-10">
        <FormSectionTitle title="참가자" />
        <Field
          label={`참가자 ${form.headcount}명`}
          hint="신청 단계에서는 대표 본인만 등록됩니다. 동반 참가자 정보(성함·생년월일·보험 등)는 신청 완료 후 마이페이지에서 입력하거나 공유 링크로 각자 입력할 수 있습니다."
        >
          {/* 대표(위 입력값 표시, 보험 희망만 선택). 동반은 신청 후 입력 */}
          <div className="rounded-[10px] border border-[#e5eaef] bg-[#f7f9fb] px-3.5 py-2.5">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <span className="rounded-[6px] px-1.5 py-0.5 font-score text-[11px] font-[500]" style={{ background: GREEN + '1f', color: GREEN }}>대표</span>
              <Text variant="sub" className="text-[#374151]">{form.name || '대표 신청자'}</Text>
              {form.phone && <Text variant="caption" className="text-[#8a94a0]">{form.phone}</Text>}
              <label className="ml-auto flex cursor-pointer items-center gap-1.5">
                <input type="checkbox" checked={form.repInsurance} onChange={(e) => set('repInsurance', e.target.checked)} className="h-4 w-4 accent-[#2f803a]" />
                <Text variant="caption" className="text-[#4b5563]">보험 희망</Text>
              </label>
            </div>
          </div>
          {form.headcount > 1 && (
            <Text variant="caption" as="p" className="mt-2 text-[#8a94a0]">
              동반 참가자 {form.headcount - 1}명 정보는 신청 완료 후 입력합니다.
            </Text>
          )}
        </Field>
      </div>

      <div className="mt-10">
        <FormSectionTitle title="추가 정보" />

        <Field label="기타 요청사항" hint="운영진이 참고할 사항이 있으면 자유롭게 적어주세요. (선택)">
          <textarea
            className={`${inputCls} min-h-[88px] resize-y`}
            value={form.note}
            onChange={(e) => set('note', e.target.value)}
            placeholder="예) 알레르기, 지병, 객실 요청 등"
          />
        </Field>

        <RouteSelect routes={form.routes} onToggle={toggleRoute} accent={GREEN} />
      </div>

      <div className="mt-10">
        <FormSectionTitle title="확인 · 동의" />

        <PrivacyConsentBox />
        <ConsentChecks
          privacyConsent={form.privacyConsent}
          confirmChecked={form.confirmChecked}
          marketingOptIn={form.marketingOptIn}
          onPrivacy={(v) => set('privacyConsent', v)}
          onConfirm={(v) => set('confirmChecked', v)}
          onMarketing={(v) => set('marketingOptIn', v)}
          accent={GREEN}
        />
      </div>

      <SummaryActions
        lines={lines}
        total={total}
        emptyHint="참가 일정과 인원을 선택하면 금액이 계산됩니다."
        accent={GREEN}
        payerDiffers={form.payerDiffers}
        payerName={form.payerName}
        onTogglePayer={togglePayerDiffers}
        onPayerName={(v) => set('payerName', v)}
        payerSelfLabel="대표 신청자"
        cashReceiptType={form.cashReceiptType}
        cashReceiptBizno={form.cashReceiptBizno}
        onCashReceiptType={(v) => set('cashReceiptType', v)}
        onCashReceiptBizno={(v) => set('cashReceiptBizno', v)}
        applicantPhone={form.phone}
        submitError={submitError}
        saved={saved}
        submitting={submitting}
        canSubmit={form.confirmChecked && form.privacyConsent}
        onSaveDraft={saveDraft}
        onSubmit={submit}
      />
    </div>
  )
}
