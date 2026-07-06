'use client'

import { useEffect, useMemo, useState } from 'react'
import FormSectionTitle from '@/components/common/FormSectionTitle'
import Text from '@/components/common/Text'
import { LoadingState } from '@/components/common/StateView'
import { useQuery } from '@/lib/useQuery'
import { getSessions, getPriceItems } from '@/lib/queries'
import { formatPeriod } from '@/lib/display'
import { submitApplication } from '@/lib/applyClient'
import ApplyComplete from '@/components/features/ApplyComplete'
import type { SessionWithCourse, PriceItem } from '@/lib/types'
import type { JikmuPayload } from '@/lib/applicationTypes'
import { LESSON_SPORTS, LESSON_CLASSES, type LessonSport } from '@/lib/lessonOptions'
import { Field, ApplicantFields, RouteSelect, PrivacyConsentBox, ConsentChecks, SummaryActions, won, inputCls, selectCls, selectTint } from './apply/shared'

// 직무연수 신청 폼(상세) — /application 마스터-디테일의 우측 페인(데스크탑) / 모달(모바일)에서 렌더. [[application-form-spec]]
// 이번 슬라이스: 기본정보 + 강습수준 + 옵션·비용(객실·렌탈) 실시간 합계 + 임시저장(localStorage).
// 가격은 price_items 실데이터 연동(하드코딩 제거). 마무리(동반인/경로/동의)·제출 배선은 다음 단계.

const NAVY = '#1e3a5f'
const JIKMU_BASE_FALLBACK = 303000 // price_items 로드 전 폴백
const DRAFT_KEY = 'pea:draft:application:jikmu'

// 강습 수준(종목·반) 정의는 lib/lessonOptions 로 이관 — 신청폼·어드민 공용 진실원천. [[jikmu-form-is-componentization-source]]
const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL'] // 의류(스키복) 사이즈
const GEAR_SIZES = ['S', 'M', 'L'] // 보호대·장갑 사이즈
// 렌탈 항목 — item_key = price_items 매칭. sizeField 있으면 선택 시 사이즈 부속 노출(고글만 사이즈 없음).
type SizeField = 'apparelSize' | 'protectorSize' | 'gloveSize'
const RENTAL_ITEMS: { key: string; field: keyof RentalSel; sizeField?: SizeField; sizes?: string[] }[] = [
  { key: 'apparel', field: 'apparel', sizeField: 'apparelSize', sizes: APPAREL_SIZES },
  { key: 'protector', field: 'protector', sizeField: 'protectorSize', sizes: GEAR_SIZES },
  { key: 'goggle', field: 'goggle' },
  { key: 'glove', field: 'glove', sizeField: 'gloveSize', sizes: GEAR_SIZES },
]

interface RentalSel {
  apparel: boolean
  goggle: boolean
  protector: boolean
  glove: boolean
}

interface JikmuForm {
  sessionId: string
  name: string
  gender: '' | 'male' | 'female'
  phone: string
  birthFront: string
  insurance: boolean
  birthBack: string
  schoolName: string
  region: string
  lessonSport: '' | LessonSport
  lessonClass: string // LESSON_CLASSES 반 key
  roomType: '' | 'group' | 'private'
  roomSpec: string // room_surcharge item_key (개별객실일 때)
  rentals: RentalSel
  apparelSize: string
  protectorSize: string
  gloveSize: string
  // 마무리(계획안 11~17)
  hasCompanion: boolean // 11 동반인 유무(옵션·비용 섹션에서 토글)
  companion: string // 11 동반인 성함
  companionPhone: string // 11 동반인 연락처(별도 신청서 매칭 키)
  notes: string // 12 특이사항
  payerDiffers: boolean // 13 입금자≠참가자(기본정보 섹션에서 토글)
  payerName: string // 13 입금자명(참가자와 다를 경우)
  routes: string[] // 14 알게 된 경로(다중)
  confirmChecked: boolean // 15 신청내용·입금자명 일치 확인(필수)
  privacyConsent: boolean // 17 개인정보/촬영 활용 동의(필수)
  marketingOptIn: boolean // 16 프로그램 연락 수신(선택)
}

const EMPTY: JikmuForm = {
  sessionId: '', name: '', gender: '', phone: '', birthFront: '',
  insurance: false, birthBack: '', schoolName: '', region: '',
  lessonSport: '', lessonClass: '', roomType: 'group', roomSpec: '',
  rentals: { apparel: false, goggle: false, protector: false, glove: false },
  apparelSize: '', protectorSize: '', gloveSize: '',
  hasCompanion: false, companion: '', companionPhone: '', notes: '', payerDiffers: false, payerName: '', routes: [],
  confirmChecked: false, privacyConsent: false, marketingOptIn: false,
}

// 선택 표시 = 라디오 체크 + 배경 틴트. 테두리는 고정(#e5eaef) — 카드와 동일하게 선택 시 테두리 안 생김.
// compact = 모바일 축약(패딩·텍스트 축소, nowrap) → 4열 등 좁은 그리드에서 체크 유지한 채 1행. 데스크탑(md)은 정상 크기.
function OptionRow({
  selected, onClick, compact, top, children,
}: { selected: boolean; onClick: () => void; compact?: boolean; top?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full rounded-[10px] border border-[#e5eaef] text-left font-score text-[clamp(0.8125rem,3.4cqi,0.875rem)] transition-colors ${
        top ? 'items-start' : 'items-center'
      } ${
        compact
          ? 'gap-1.5 whitespace-nowrap px-2 py-2.5 md:gap-2.5 md:px-3.5'
          : 'gap-2.5 px-3.5 py-2.5'
      }`}
      style={{
        background: selected ? NAVY + '12' : '#ffffff',
        color: selected ? NAVY : '#4b5563',
      }}
    >
      <span
        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${top ? 'mt-0.5' : ''}`}
        style={{ borderColor: selected ? NAVY : '#cbd2da' }}
      >
        {selected && <span className="h-2 w-2 rounded-full" style={{ background: NAVY }} />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  )
}

// 다중선택(렌탈) 전용 — 사각 체크 + 우측 금액. OptionRow(라디오)와 시각 구분.
function ToggleRow({
  selected, onClick, label, amount,
}: { selected: boolean; onClick: () => void; label: string; amount: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex w-full items-center gap-2.5 rounded-[10px] border border-[#e5eaef] px-3.5 py-2.5 text-left font-score text-[clamp(0.8125rem,3.4cqi,0.875rem)] transition-colors"
      style={{
        background: selected ? NAVY + '12' : '#ffffff',
        color: selected ? NAVY : '#4b5563',
      }}
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border"
        style={{ borderColor: selected ? NAVY : '#cbd2da', background: selected ? NAVY : '#ffffff' }}
      >
        {selected && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.2l2.2 2.3L9.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
      <span className="shrink-0 font-score text-[clamp(0.71875rem,3.08cqi,0.8125rem)] tabular-nums" style={{ color: selected ? NAVY : '#8a94a0' }}>
        +{won(amount)}
      </span>
    </button>
  )
}

export default function JikmuApplyForm() {
  const sessions = useQuery<SessionWithCourse[]>(getSessions, [])
  const prices = useQuery<PriceItem[]>(getPriceItems, [])
  const [form, setForm] = useState<JikmuForm>(EMPTY)
  const [saved, setSaved] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [resultNo, setResultNo] = useState<string | null>(null)

  useEffect(() => {
    const raw = typeof window !== 'undefined' ? window.localStorage.getItem(DRAFT_KEY) : null
    if (raw) {
      try {
        const p = JSON.parse(raw) as Partial<JikmuForm>
        setForm({ ...EMPTY, ...p, rentals: { ...EMPTY.rentals, ...(p.rentals ?? {}) } })
      } catch {
        /* 손상된 드래프트 무시 */
      }
    }
  }, [])

  const jikmuSessions = useMemo(
    () => (sessions.data ?? []).filter((s) => s.schedule_type === 'jikmu'),
    [sessions.data],
  )

  // price_items 를 item_key 로 인덱싱 + 카테고리별 목록
  const itemBy = useMemo(() => {
    const m: Record<string, PriceItem> = {}
    for (const p of prices.data) m[p.item_key] = p
    return m
  }, [prices.data])
  const roomOptions = useMemo(
    () => prices.data.filter((p) => p.category === 'room_surcharge'),
    [prices.data],
  )

  const base = itemBy['jikmu_base']?.amount ?? JIKMU_BASE_FALLBACK

  // 실시간 합계 라인아이템 — 일정 선택 시부터 계상.
  const lines = useMemo(() => {
    const out: { label: string; amount: number }[] = []
    if (!form.sessionId) return out
    out.push({ label: '기본 연수비', amount: base })
    if (form.roomType === 'private' && form.roomSpec && itemBy[form.roomSpec]) {
      const r = itemBy[form.roomSpec]
      out.push({ label: `개별객실 · ${r.label}`, amount: r.amount })
    }
    for (const { key, field } of RENTAL_ITEMS) {
      if (form.rentals[field] && itemBy[key]) {
        out.push({ label: itemBy[key].label, amount: itemBy[key].amount })
      }
    }
    return out
  }, [form.sessionId, form.roomType, form.roomSpec, form.rentals, base, itemBy])
  const total = lines.reduce((s, l) => s + l.amount, 0)

  const set = <K extends keyof JikmuForm>(k: K, v: JikmuForm[K]) => {
    setForm((f) => ({ ...f, [k]: v }))
    setSaved(false)
  }
  // 기본정보 공통 필드셋(ApplicantFields)용 patch 세터.
  const patch = (p: Partial<JikmuForm>) => {
    setForm((f) => ({ ...f, ...p }))
    setSaved(false)
  }
  // 종목 변경 시 선택 반 초기화(반은 종목에 종속).
  const setSport = (v: LessonSport) => {
    setForm((f) => (f.lessonSport === v ? f : { ...f, lessonSport: v, lessonClass: '' }))
    setSaved(false)
  }
  const toggleRental = (field: keyof RentalSel) => {
    setForm((f) => ({ ...f, rentals: { ...f.rentals, [field]: !f.rentals[field] } }))
    setSaved(false)
  }
  const toggleRoute = (r: string) => {
    setForm((f) => ({ ...f, routes: f.routes.includes(r) ? f.routes.filter((x) => x !== r) : [...f.routes, r] }))
    setSaved(false)
  }
  // 동반인 유무 토글 — 해제 시 성함·연락처 초기화.
  const toggleCompanion = (v: boolean) => {
    setForm((f) => ({ ...f, hasCompanion: v, companion: v ? f.companion : '', companionPhone: v ? f.companionPhone : '' }))
    setSaved(false)
  }
  // 입금자≠참가자 토글 — 해제 시 입금자명 초기화.
  const togglePayerDiffers = (v: boolean) => {
    setForm((f) => ({ ...f, payerDiffers: v, payerName: v ? f.payerName : '' }))
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
      !a.sessionId ? '참가 연수 일정을 선택해 주세요.'
      : !a.name.trim() ? '참가자 성함을 입력해 주세요.'
      : !a.gender ? '성별을 선택해 주세요.'
      : a.phone.length < 10 ? '연락처를 정확히 입력해 주세요.'
      : a.birthFront.length !== 6 ? '생년월일 6자리를 입력해 주세요.'
      : !a.schoolName.trim() ? '소속을 입력해 주세요.'
      : !a.region ? '지역을 선택해 주세요.'
      : !a.lessonSport ? '종목을 선택해 주세요.'
      : !a.lessonClass ? '희망 강습 수준을 선택해 주세요.'
      : a.roomType === 'private' && !a.roomSpec ? '개별객실 평형·인실을 선택해 주세요.'
      : a.insurance && a.birthBack.length !== 7 ? '보험 가입용 주민번호 뒷자리 7자리를 입력해 주세요.'
      : !a.privacyConsent || !a.confirmChecked ? '필수 동의 항목을 확인해 주세요.'
      : null
    if (err) {
      setSubmitError(err)
      return
    }

    const payload: JikmuPayload = {
      kind: 'jikmu',
      sessionId: a.sessionId,
      applicant: { name: a.name.trim(), gender: a.gender, phone: a.phone, birthFront: a.birthFront, schoolName: a.schoolName.trim(), region: a.region },
      insurance: a.insurance,
      birthBack: a.insurance ? a.birthBack : '',
      lessonSport: a.lessonSport,
      lessonClass: a.lessonClass,
      roomType: a.roomType || 'group',
      roomSpec: a.roomSpec,
      rentals: a.rentals,
      apparelSize: a.apparelSize,
      protectorSize: a.protectorSize,
      gloveSize: a.gloveSize,
      hasCompanion: a.hasCompanion,
      companion: a.companion,
      companionPhone: a.companionPhone,
      notes: a.notes,
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

  if (resultNo) return <ApplyComplete applicationNo={resultNo} accent={NAVY} />

  return (
    <div>
      <FormSectionTitle title="기본 정보" />

      {sessions.loading ? (
        <LoadingState />
      ) : (
        <Field label="참가 연수 일정" required>
          <div className="space-y-2">
            {jikmuSessions.length === 0 ? (
              <Text variant="sub" className="text-[#9ca3af]">개설된 직무연수 일정이 없습니다.</Text>
            ) : (
              jikmuSessions.map((s) => (
                <OptionRow key={s.id} selected={form.sessionId === s.id} onClick={() => set('sessionId', s.id)}>
                  <span className="block tabular-nums font-[500] md:inline">{formatPeriod(s.starts_on, s.ends_on, s.nights)}</span>
                  {s.course?.name && (
                    <>
                      <span className="hidden text-[#8a94a0] md:inline"> · {s.course.name}</span>
                      <span className="mt-0.5 block text-[clamp(0.71875rem,3.08cqi,0.75rem)] text-[#8a94a0] md:hidden">{s.course.name}</span>
                    </>
                  )}
                </OptionRow>
              ))
            )}
          </div>
        </Field>
      )}

      <ApplicantFields
        value={form}
        onChange={patch}
        accent={NAVY}
        personLabel="참가자 "
        namePlaceholder="본인 성함"
        schoolPlaceholder="소속교 기입"
        birthExtra={
          <>
            <label className="mt-2.5 flex items-center gap-2">
              <input
                type="checkbox"
                checked={form.insurance}
                onChange={(e) => set('insurance', e.target.checked)}
                className="h-4 w-4 accent-[#1e3a5f]"
              />
              <Text variant="sub" className="text-[#4b5563]">여행자 보험 가입 희망 (주민등록번호 뒷자리 필요)</Text>
            </label>
            {form.insurance && (
              <input
                className={`${inputCls} mt-2`}
                value={form.birthBack}
                onChange={(e) => set('birthBack', e.target.value.replace(/\D/g, '').slice(0, 7))}
                placeholder="뒷자리 7자리 (보험 가입용)"
                inputMode="numeric"
              />
            )}
          </>
        }
      />

      <div className="mt-10">
        <FormSectionTitle title="강습 수준" />

        <Field label="종목" required>
          <div className="grid grid-cols-2 gap-2">
            {LESSON_SPORTS.map((sp) => (
              <OptionRow key={sp.key} selected={form.lessonSport === sp.key} onClick={() => setSport(sp.key)}>{sp.label}</OptionRow>
            ))}
          </div>
        </Field>

        {form.lessonSport && (
          <Field label="희망 강습 수준" required hint="조 편성 참고용입니다. 비용에는 영향이 없습니다.">
            <div className="space-y-2">
              {LESSON_CLASSES[form.lessonSport].map((c) => (
                <OptionRow key={c.key} top selected={form.lessonClass === c.key} onClick={() => set('lessonClass', c.key)}>
                  <span className="block font-[500]">
                    {c.label}
                    <span className="ml-1 text-[0.9em] font-[400] text-[#8a94a0]">({c.cond})</span>
                  </span>
                  <span className="mt-0.5 block text-[clamp(0.71875rem,3.08cqi,0.75rem)] font-[400] text-[#8a94a0]">{c.goal}</span>
                </OptionRow>
              ))}
            </div>
          </Field>
        )}
      </div>

      <div className="mt-10">
        <FormSectionTitle title="옵션 · 비용" />

        <Field label="동반인" hint="같은 방·같은 강습조로 배정받고 싶은 동반 참가자가 있으면 체크해 주세요. 동반인도 별도로 신청해야 하며, 동명이인 구분·매칭을 위해 성함과 연락처가 필요합니다.">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.hasCompanion} onChange={(e) => toggleCompanion(e.target.checked)} className="h-4 w-4 accent-[#1e3a5f]" />
            <Text variant="sub" className="text-[#4b5563]">동반인이 있습니다</Text>
          </label>
          {form.hasCompanion && (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <input className={inputCls} value={form.companion} onChange={(e) => set('companion', e.target.value)} placeholder="동반인 성함" />
              <input
                className={inputCls}
                value={form.companionPhone}
                onChange={(e) => set('companionPhone', e.target.value.replace(/\D/g, '').slice(0, 11))}
                placeholder="동반인 연락처 (- 없이)"
                inputMode="numeric"
              />
            </div>
          )}
        </Field>

        <Field
          label="객실"
          required
          hint={<>단체객실은 추가금이 없습니다.<br className="md:hidden" /> 개별객실은 평형·인실에 따라 추가금이 발생합니다.</>}
        >
          <div className="grid grid-cols-2 gap-2">
            <OptionRow selected={form.roomType === 'group'} onClick={() => { set('roomType', 'group'); set('roomSpec', '') }}>단체객실</OptionRow>
            <OptionRow selected={form.roomType === 'private'} onClick={() => set('roomType', 'private')}>개별객실</OptionRow>
          </div>
          {form.roomType === 'private' && (
            <select
              className={`${selectCls} mt-2`}
              value={form.roomSpec}
              onChange={(e) => set('roomSpec', e.target.value)}
              style={selectTint(NAVY, !!form.roomSpec)}
            >
              <option value="">평형 · 인실 선택</option>
              {roomOptions.map((r) => (
                <option key={r.item_key} value={r.item_key}>{r.label} (+{won(r.amount)})</option>
              ))}
            </select>
          )}
        </Field>

        <Field label="렌탈" hint="필요한 장비를 선택하세요.">
          <div className="space-y-2">
            {RENTAL_ITEMS.map(({ key, field, sizeField, sizes }) => {
              const item = itemBy[key]
              if (!item) return null
              return (
                <div key={key}>
                  <ToggleRow selected={form.rentals[field]} onClick={() => toggleRental(field)} label={item.label} amount={item.amount} />
                  {sizeField && sizes && form.rentals[field] && (
                    <select
                      className={`${selectCls} mt-2`}
                      value={form[sizeField]}
                      onChange={(e) => set(sizeField, e.target.value)}
                      style={selectTint(NAVY, !!form[sizeField])}
                    >
                      <option value="">{item.label} 사이즈 선택</option>
                      {sizes.map((sz) => (
                        <option key={sz} value={sz}>{sz}</option>
                      ))}
                    </select>
                  )}
                </div>
              )
            })}
          </div>
        </Field>
      </div>

      <div className="mt-10">
        <FormSectionTitle title="추가 정보" />

        <Field label="특이사항" hint="운영진이 참고할 사항이 있으면 기재 (선택)">
          <textarea
            className={`${inputCls} min-h-[80px] resize-y`}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
            placeholder="예) 알레르기, 지병, 요청사항 등"
          />
        </Field>

        <RouteSelect routes={form.routes} onToggle={toggleRoute} accent={NAVY} />
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
          accent={NAVY}
        />
      </div>

      <SummaryActions
        lines={lines}
        total={total}
        emptyHint="참가 일정을 선택하면 금액이 계산됩니다."
        accent={NAVY}
        payerDiffers={form.payerDiffers}
        payerName={form.payerName}
        onTogglePayer={togglePayerDiffers}
        onPayerName={(v) => set('payerName', v)}
        payerSelfLabel="참가자"
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
