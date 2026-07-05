'use client'

import { useEffect, useMemo, useState } from 'react'
import FormSectionTitle from '@/components/common/FormSectionTitle'
import Text, { BTN } from '@/components/common/Text'
import { LoadingState } from '@/components/common/StateView'
import { useQuery } from '@/lib/useQuery'
import { getSessions, getPriceItems } from '@/lib/queries'
import { formatPeriod } from '@/lib/display'
import { submitApplication } from '@/lib/applyClient'
import ApplyComplete from '@/components/features/ApplyComplete'
import type { SessionWithCourse, PriceItem } from '@/lib/types'
import type { JikmuPayload } from '@/lib/applicationTypes'
import { LESSON_SPORTS, LESSON_CLASSES, type LessonSport } from '@/lib/lessonOptions'

// 직무연수 신청 폼(상세) — /application 마스터-디테일의 우측 페인(데스크탑) / 모달(모바일)에서 렌더. [[application-form-spec]]
// 이번 슬라이스: 기본정보 + 강습수준 + 옵션·비용(객실·렌탈) 실시간 합계 + 임시저장(localStorage).
// 가격은 price_items 실데이터 연동(하드코딩 제거). 마무리(동반인/경로/동의)·제출 배선은 다음 단계.

const NAVY = '#1e3a5f'
const JIKMU_BASE_FALLBACK = 303000 // price_items 로드 전 폴백
const DRAFT_KEY = 'pea:draft:application:jikmu'

const REGIONS = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시',
  '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도',
  '경상북도', '경상남도', '제주특별자치도',
]

// 강습 수준(종목·반) 정의는 lib/lessonOptions 로 이관 — 신청폼·어드민 공용 진실원천. [[jikmu-form-is-componentization-source]]
const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL']
// 알게 된 경로(계획안 14번) — 필수X·중복선택.
const ROUTE_OPTIONS = ['체육교육회 홈페이지', '교육청 연수원 게시글', '학교 내 공문', '지인 소개', '과거 참가자']
// 렌탈 항목 — item_key = price_items 매칭. apparel 은 사이즈 부속 선택.
const RENTAL_ITEMS: { key: string; field: keyof RentalSel }[] = [
  { key: 'apparel', field: 'apparel' },
  { key: 'protector', field: 'protector' },
  { key: 'goggle', field: 'goggle' },
  { key: 'glove', field: 'glove' },
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
  apparelSize: '',
  hasCompanion: false, companion: '', companionPhone: '', notes: '', payerDiffers: false, payerName: '', routes: [],
  confirmChecked: false, privacyConsent: false, marketingOptIn: false,
}

const won = (n: number) => n.toLocaleString('ko-KR') + '원'

// ⚠ 입력 컨트롤은 16px 고정(cqi 제외) — iOS Safari가 <16px 입력 포커스 시 자동 확대(zoom)하는 것 방지. [[type-scale-cqi-system]]
// 통일 규칙: 포커스에 하드 테두리 안 씀(테두리 고정 #e5eaef). 포커스는 옅은 배경 틴트로만.
const inputCls =
  'w-full rounded-[10px] border border-[#e5eaef] bg-white px-3.5 py-2.5 font-score text-[16px] text-[#1f2937] placeholder:text-[#b6bcc4] transition-colors focus:bg-[#f7f9fb] focus:outline-none'
// 드롭다운 — 선택 시 테두리(포커스 잔상) 대신 배경 틴트로 상태 표시(OptionRow와 통일, 하드 테두리 안 생김). 배경은 값 유무로 style 지정.
const selectCls =
  'w-full appearance-none rounded-[10px] border border-[#e5eaef] px-3.5 py-2.5 font-score text-[16px] text-[#1f2937] transition-colors focus:outline-none'

function Field({
  label, required, hint, children,
}: { label: string; required?: boolean; hint?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="mb-5">
      <label className="mb-2 block font-score text-[clamp(0.8125rem,3.4cqi,0.875rem)] font-[500] text-[#1f2937]">
        {label}
        {required && <span className="text-[#c0685a]"> *</span>}
      </label>
      {children}
      {hint && <p className="mt-1.5 font-score text-[clamp(0.71875rem,3.08cqi,0.75rem)] font-[400] text-[#9ca3af]">{hint}</p>}
    </div>
  )
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

// 다중선택(경로 등) — 사각 체크 + 라벨. ToggleRow에서 금액만 뺀 형태.
function CheckRow({ selected, onClick, label }: { selected: boolean; onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex w-full items-center gap-2.5 rounded-[10px] border border-[#e5eaef] px-3.5 py-2.5 text-left font-score text-[clamp(0.8125rem,3.4cqi,0.875rem)] transition-colors"
      style={{ background: selected ? NAVY + '12' : '#ffffff', color: selected ? NAVY : '#4b5563' }}
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
    </button>
  )
}

// 동의·확인 체크(계획안 15~17) — 네이티브 체크박스 + 설명. required면 라벨 옆 *.
function ConsentRow({
  checked, onChange, children,
}: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0 accent-[#1e3a5f]" />
      <Text variant="sub" className="text-[#4b5563]">{children}</Text>
    </label>
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

      <Field label="참가자 성함" required>
        <input className={inputCls} value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="본인 성함" />
      </Field>

      <Field label="참가자 성별" required>
        <div className="grid grid-cols-2 gap-2">
          <OptionRow selected={form.gender === 'male'} onClick={() => set('gender', 'male')}>남자</OptionRow>
          <OptionRow selected={form.gender === 'female'} onClick={() => set('gender', 'female')}>여자</OptionRow>
        </div>
      </Field>

      <Field label="참가자 연락처" required>
        <input
          className={inputCls}
          value={form.phone}
          onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 11))}
          placeholder="01000000000 (- 없이 숫자만)"
          inputMode="numeric"
        />
      </Field>

      <Field label="참가자 생년월일" required hint="YYMMDD 6자리">
        <input
          className={inputCls}
          value={form.birthFront}
          onChange={(e) => set('birthFront', e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="YYMMDD"
          inputMode="numeric"
        />
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
      </Field>

      <Field label="소속" required>
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} value={form.schoolName} onChange={(e) => set('schoolName', e.target.value)} placeholder="소속교 기입" />
          <select className={selectCls} value={form.region} onChange={(e) => set('region', e.target.value)} style={{ background: form.region ? NAVY + '12' : '#ffffff' }}>
            <option value="">지역 선택</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </Field>

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
              style={{ background: form.roomSpec ? NAVY + '12' : '#ffffff' }}
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
            {RENTAL_ITEMS.map(({ key, field }) => {
              const item = itemBy[key]
              if (!item) return null
              return (
                <div key={key}>
                  <ToggleRow selected={form.rentals[field]} onClick={() => toggleRental(field)} label={item.label} amount={item.amount} />
                  {field === 'apparel' && form.rentals.apparel && (
                    <select
                      className={`${selectCls} mt-2`}
                      value={form.apparelSize}
                      onChange={(e) => set('apparelSize', e.target.value)}
                      style={{ background: form.apparelSize ? NAVY + '12' : '#ffffff' }}
                    >
                      <option value="">스키복 사이즈 선택</option>
                      {APPAREL_SIZES.map((sz) => (
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

        <Field label="알게 된 경로" hint="중복 선택 가능 (선택)">
          <div className="grid grid-cols-2 gap-2">
            {ROUTE_OPTIONS.map((r) => (
              <CheckRow key={r} selected={form.routes.includes(r)} onClick={() => toggleRoute(r)} label={r} />
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-10">
        <FormSectionTitle title="확인 · 동의" />

        <Field label="입금자" hint="입금자가 참가자와 다르면 체크해 주세요. 신청 성함과 입금자명이 다르면 접수 확정이 지연될 수 있습니다.">
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.payerDiffers} onChange={(e) => togglePayerDiffers(e.target.checked)} className="h-4 w-4 accent-[#1e3a5f]" />
            <Text variant="sub" className="text-[#4b5563]">입금자가 참가자와 다릅니다</Text>
          </label>
          {form.payerDiffers && (
            <input className={`${inputCls} mt-2`} value={form.payerName} onChange={(e) => set('payerName', e.target.value)} placeholder="입금자 성함" />
          )}
        </Field>

        {/* 17 개인정보 수집·이용/촬영 활용 고지문 — 스크롤 박스 + 필수 동의 체크. */}
        <div className="mb-4 max-h-[220px] overflow-y-auto rounded-[10px] border border-[#e5eaef] bg-[#f7f9fb] p-4 [container-type:inline-size]">
          <Text variant="sub" className="text-[#4b5563]">
            체육교육회는 연수 신청·운영을 위하여 아래와 같이 개인정보를 수집·이용하며, 연수 과정에서 촬영된 사진·영상물을 교육 및 홍보 목적으로 활용하고자 합니다. 내용을 충분히 확인하신 후 동의 여부를 선택해 주세요.
          </Text>
          <div className="mt-3 space-y-3">
            {[
              { h: '1. 수집·이용 목적', body: '연수 참가 신청·접수 관리 / 연수 운영·참가자 확인 / 보험 가입·안전관리 / 연수 안내사항 전달 / 이수·결과 관리 / 홈페이지·SNS·홍보물·보도자료 등 교육활동 홍보' },
              { h: '2. 수집 항목', body: '[필수] 성명 · 소속기관(학교) · 휴대전화번호 · 생년월일\n[보험 가입 시 추가] 주민등록번호 뒷자리 ※ 보험 가입 등 법령상 허용된 목적에 한하여 수집·이용' },
              { h: '3. 보유·이용기간', body: '연수 종료 후 2년간 보관 후 지체 없이 파기. 단, 홍보·기록 보존 목적으로 활용된 촬영물은 관련 사업 종료 후 보관될 수 있음' },
              { h: '4. 동의 거부 권리', body: '동의를 거부할 권리가 있으며, 필수정보 수집에 동의하지 않을 경우 연수 신청·보험 가입·연수 참여가 제한될 수 있습니다.' },
            ].map((s) => (
              <div key={s.h}>
                <Text variant="label" className="text-[#374151]">{s.h}</Text>
                <Text variant="caption" className="mt-0.5 block whitespace-pre-line text-[#6b7280]">{s.body}</Text>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3 rounded-[10px] border border-[#e5eaef] bg-white p-4">
          <ConsentRow checked={form.privacyConsent} onChange={(v) => set('privacyConsent', v)}>
            <span className="text-[#c0685a]">[필수] </span>위 개인정보 수집·이용 및 촬영물 활용에 동의합니다.
          </ConsentRow>
          <ConsentRow checked={form.confirmChecked} onChange={(v) => set('confirmChecked', v)}>
            <span className="text-[#c0685a]">[필수] </span>신청 내용을 다시 확인했으며, 신청 성함과 입금자명이 일치하지 않으면 접수 확정이 늦어질 수 있음을 확인했습니다.
          </ConsentRow>
          <ConsentRow checked={form.marketingOptIn} onChange={(v) => set('marketingOptIn', v)}>
            [선택] 추후 체육교육회의 프로그램 안내 연락을 받겠습니다.
          </ConsentRow>
        </div>
      </div>

      {/* 합계·액션 */}
      <div className="mt-8 rounded-[12px] border border-[#e5eaef] bg-[#f7f9fb] p-4">
        {lines.length === 0 ? (
          <Text variant="sub" className="text-[#9ca3af]">참가 일정을 선택하면 금액이 계산됩니다.</Text>
        ) : (
          <div className="space-y-2">
            {lines.map((l, i) => (
              <div key={i} className="flex items-center justify-between">
                <Text variant="sub" className="text-[#4b5563]">{l.label}</Text>
                <Text variant="num" color="#4b5563">{won(l.amount)}</Text>
              </div>
            ))}
          </div>
        )}
        <div className="mt-3 flex items-center justify-between border-t border-[#e5eaef] pt-3">
          <Text variant="card-title-sm">총 금액</Text>
          <Text variant="num-lg">{won(total)}</Text>
        </div>
        {submitError && (
          <p className="mt-3 rounded-[8px] bg-[#fbecea] px-3 py-2 text-center font-score text-[13px] text-[#b4483a]">{submitError}</p>
        )}
        <div className="mt-4 grid grid-cols-[130px_1fr] gap-2">
          <button
            type="button"
            onClick={saveDraft}
            disabled={submitting}
            className={`rounded-[10px] border border-[#e5eaef] bg-white px-4 py-3 ${BTN} text-[#4b5563] transition-colors hover:bg-[#f2f5f9] disabled:opacity-40`}
          >
            {saved ? '저장됨 ✓' : '임시저장'}
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={submitting || !form.confirmChecked || !form.privacyConsent}
            className={`rounded-[10px] bg-[#1e3a5f] py-3 ${BTN} text-white transition-colors hover:bg-[#16304f] disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-[#1e3a5f]`}
          >
            {submitting ? '신청 중…' : '신청하기'}
          </button>
        </div>
      </div>
    </div>
  )
}
