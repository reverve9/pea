'use client'

import { useEffect, useMemo, useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import FormSectionTitle from '@/components/common/FormSectionTitle'
import Text from '@/components/common/Text'
import { LoadingState } from '@/components/common/StateView'
import { useQuery } from '@/lib/useQuery'
import { getSessions, getPriceItems } from '@/lib/queries'
import { formatPeriod } from '@/lib/display'
import { submitApplication } from '@/lib/applyClient'
import ApplyComplete from '@/components/features/ApplyComplete'
import { JAYUL_LESSONS, EQUIPMENT_TYPES } from '@/lib/lessonOptions'
import { Field, ApplicantFields, RouteSelect, PrivacyConsentBox, ConsentChecks, SummaryActions, won, inputCls } from './apply/shared'
import type { SessionWithCourse, PriceItem, ScheduleType } from '@/lib/types'
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
  { key: 'weekend_1n', label: '주말 1박', spec: '1박 2일' },
  { key: 'weekend_2n', label: '주말 2박', spec: '2박 3일' },
  { key: 'weekday_2n', label: '주중 2박', spec: '2박 3일' },
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
  schoolName: string
  region: string
  lessonClass: string // 대표 기초강습(jayul_ski/jayul_board/jayul_freeride)
  equipment: '' | 'ski' | 'board' // 대표 대여 장비 세트
  rentals: Record<RentalKey, number> // 항목별 수량(비용만). 사이즈·귀속은 신청 후 대표 배정
  repInsurance: boolean // 대표 본인 보험 희망
  note: string // 기타 요청사항(자유기술)
  // 추가 정보·확인·동의(직무폼과 공통 — 내일 컴포넌트화)
  payerDiffers: boolean // 입금자≠대표
  payerName: string // 입금자명
  routes: string[] // 알게 된 경로(다중)
  confirmChecked: boolean // 신청·입금자명 일치 확인(필수)
  privacyConsent: boolean // 개인정보·촬영 동의(필수)
  marketingOptIn: boolean // 프로그램 연락 수신(선택)
}

const EMPTY: JayulForm = {
  variant: '', sessionId: '', headcount: 1, name: '', gender: '', phone: '', birthFront: '',
  schoolName: '', region: '', lessonClass: '', equipment: '',
  rentals: { apparel: 0, goggle: 0, protector: 0, glove: 0 },
  repInsurance: false,
  note: '',
  payerDiffers: false, payerName: '', routes: [],
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

// 수량형(렌탈) — 라벨 + 개당 금액 + 스텝퍼(−/값/+). 0이면 회색, ≥1이면 그린.
function QtyRow({
  label, unit, qty, max, onChange,
}: { label: string; unit: number; qty: number; max: number; onChange: (n: number) => void }) {
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
          개당 {won(unit)}
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
  const prices = useQuery<PriceItem[]>(getPriceItems, [])
  const [form, setForm] = useState<JayulForm>(EMPTY)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [resultNo, setResultNo] = useState<string | null>(null)

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

  const itemBy = useMemo(() => {
    const m: Record<string, PriceItem> = {}
    for (const p of prices.data) m[p.item_key] = p
    return m
  }, [prices.data])

  // pkg 묶음가 — pkg_{변형}_{인원}. 유형 미선택이면 0.
  const pkgAmount = form.variant ? itemBy[`pkg_${form.variant}_${form.headcount}`]?.amount ?? 0 : 0

  // 실시간 합계 라인아이템 — 유형·차수 선택 시부터 계상.
  const lines = useMemo(() => {
    const out: { label: string; amount: number }[] = []
    if (!form.variant || !form.sessionId) return out
    out.push({ label: `${VARIANT_LABEL[form.variant]} · ${form.headcount}인 패키지`, amount: pkgAmount })
    for (const key of RENTAL_KEYS) {
      const qty = form.rentals[key]
      if (qty > 0 && itemBy[key]) out.push({ label: `${itemBy[key].label} ×${qty}`, amount: itemBy[key].amount * qty })
    }
    return out
  }, [form.variant, form.sessionId, form.headcount, form.rentals, pkgAmount, itemBy])
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
  // 유형 변경 시 선택 차수 초기화(차수는 유형에 종속).
  const setVariant = (v: JayulVariant) => {
    setForm((f) => (f.variant === v ? f : { ...f, variant: v, sessionId: '' }))
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
      : !a.schoolName.trim() ? '소속을 입력해 주세요.'
      : !a.region ? '지역을 선택해 주세요.'
      : !a.lessonClass ? '기초 단체 강습을 선택해 주세요.'
      : !a.equipment ? '대여 장비를 선택해 주세요.'
      : !a.privacyConsent || !a.confirmChecked ? '필수 동의 항목을 확인해 주세요.'
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
      applicant: { name: a.name.trim(), gender: a.gender, phone: a.phone, birthFront: a.birthFront, schoolName: a.schoolName.trim(), region: a.region },
      lessonClass: a.lessonClass,
      equipment: a.equipment,
      rentals: a.rentals,
      repInsurance: a.repInsurance,
      note: a.note,
      payerDiffers: a.payerDiffers,
      payerName: a.payerName,
      routes: a.routes,
      privacyConsent: a.privacyConsent,
      marketingOptIn: a.marketingOptIn,
    }
    setSubmitting(true)
    try {
      const { application_no } = await submitApplication(payload)
      window.localStorage.removeItem(DRAFT_KEY)
      setResultNo(application_no)
      window.scrollTo({ top: 0 })
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : '신청 처리 중 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  if (resultNo) return <ApplyComplete applicationNo={resultNo} accent={GREEN} />

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
                    <span className="block tabular-nums font-[500] md:inline">{formatPeriod(s.starts_on, s.ends_on, s.nights)}</span>
                    <span className="mt-0.5 block text-[clamp(0.71875rem,3.08cqi,0.75rem)] text-[#8a94a0] md:mt-0 md:ml-1.5 md:inline">{s.label}</span>
                  </OptionRow>
                ))
              )}
            </div>
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
          schoolPlaceholder="소속 기입"
        />
      </div>

      <div className="mt-10">
        <FormSectionTitle title="기초강습 · 대여 장비" />
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
              if (!item) return null
              return (
                <QtyRow
                  key={key}
                  label={item.label}
                  unit={item.amount}
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
