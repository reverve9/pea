'use client'

import { useEffect, useMemo, useState } from 'react'
import FormSectionTitle from '@/components/common/FormSectionTitle'
import Text, { BTN } from '@/components/common/Text'
import { LoadingState } from '@/components/common/StateView'
import { useQuery } from '@/lib/useQuery'
import { getSessions, getPriceItems } from '@/lib/queries'
import { formatPeriod } from '@/lib/display'
import type { SessionWithCourse, PriceItem } from '@/lib/types'

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

const LESSON_LEVELS = ['입문', '초급', '중급', '고급'] // 배정용(가격 무관)
const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL']
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
  lessonLevel: string
  roomType: '' | 'group' | 'private'
  roomSpec: string // room_surcharge item_key (개별객실일 때)
  rentals: RentalSel
  apparelSize: string
}

const EMPTY: JikmuForm = {
  sessionId: '', name: '', gender: '', phone: '', birthFront: '',
  insurance: false, birthBack: '', schoolName: '', region: '',
  lessonLevel: '', roomType: 'group', roomSpec: '',
  rentals: { apparel: false, goggle: false, protector: false, glove: false },
  apparelSize: '',
}

const won = (n: number) => n.toLocaleString('ko-KR') + '원'

// ⚠ 입력 컨트롤은 16px 고정(cqi 제외) — iOS Safari가 <16px 입력 포커스 시 자동 확대(zoom)하는 것 방지. [[type-scale-cqi-system]]
const inputCls =
  'w-full rounded-[10px] border border-[#e5eaef] bg-white px-3.5 py-2.5 font-score text-[16px] text-[#1f2937] placeholder:text-[#b6bcc4] transition-colors focus:border-[#1e3a5f] focus:outline-none'

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
  selected, onClick, compact, children,
}: { selected: boolean; onClick: () => void; compact?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full items-center rounded-[10px] border border-[#e5eaef] text-left font-score text-[clamp(0.8125rem,3.4cqi,0.875rem)] transition-colors ${
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
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border"
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
  const toggleRental = (field: keyof RentalSel) => {
    setForm((f) => ({ ...f, rentals: { ...f.rentals, [field]: !f.rentals[field] } }))
    setSaved(false)
  }

  const saveDraft = () => {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form))
    setSaved(true)
  }

  const submit = () => {
    /* TODO: service_role /api 제출 파이프라인(insert · 뒷자리 암호화 · 발번 · price_breakdown 스냅샷) */
  }

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
          onChange={(e) => set('phone', e.target.value.replace(/[^\d-]/g, ''))}
          placeholder="010-0000-0000"
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
          <select className={`${inputCls} appearance-none`} value={form.region} onChange={(e) => set('region', e.target.value)}>
            <option value="">지역 선택</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </Field>

      <div className="mt-10">
        <FormSectionTitle title="강습 수준" />
        <Field label="희망 강습 수준" required hint="조 편성 참고용입니다. 비용에는 영향이 없습니다.">
          <div className="grid grid-cols-4 gap-2">
            {LESSON_LEVELS.map((lv) => (
              <OptionRow key={lv} compact selected={form.lessonLevel === lv} onClick={() => set('lessonLevel', lv)}>{lv}</OptionRow>
            ))}
          </div>
        </Field>
      </div>

      <div className="mt-10">
        <FormSectionTitle title="옵션 · 비용" />

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
              className={`${inputCls} mt-2 appearance-none`}
              value={form.roomSpec}
              onChange={(e) => set('roomSpec', e.target.value)}
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
                      className={`${inputCls} mt-2 appearance-none`}
                      value={form.apparelSize}
                      onChange={(e) => set('apparelSize', e.target.value)}
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

      {/* 다음 단계: 마무리(동반인 납부계획 · 특이사항 · 알게된 경로 · 개인정보 동의 · 마케팅) + 제출 파이프라인. */}

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
        <div className="mt-4 grid grid-cols-[130px_1fr] gap-2">
          <button
            type="button"
            onClick={saveDraft}
            className={`rounded-[10px] border border-[#e5eaef] bg-white px-4 py-3 ${BTN} text-[#4b5563] transition-colors hover:bg-[#f2f5f9]`}
          >
            {saved ? '저장됨 ✓' : '임시저장'}
          </button>
          <button
            type="button"
            onClick={submit}
            className={`rounded-[10px] bg-[#1e3a5f] py-3 ${BTN} text-white transition-colors hover:bg-[#16304f]`}
          >
            신청하기
          </button>
        </div>
      </div>
    </div>
  )
}
