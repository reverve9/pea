'use client'

import Text, { BTN } from '@/components/common/Text'

// 신청폼 공용 조각 — 직무(JikmuApplyForm)·자율(JayulApplyForm) 공유. accent(브랜드색)만 prop 으로 분기.
// 도메인 섹션(종목/객실/렌탈수량 등)은 각 폼에 인라인. 여기엔 100% 동일한 프리미티브·고지문·입금자·경로만. [[jikmu-form-is-componentization-source]]
// ⚠ 입력 컨트롤 16px 고정(iOS <16px 포커스 확대 방지) + 포커스 하드 테두리 금지(옅은 배경 틴트로만). [[type-scale-cqi-system]]

export const won = (n: number) => n.toLocaleString('ko-KR') + '원'

export const inputCls =
  'w-full rounded-[10px] border border-[#e5eaef] bg-white px-3.5 py-2.5 font-score text-[16px] text-[#1f2937] placeholder:text-[#b6bcc4] transition-colors focus:bg-[#f7f9fb] focus:outline-none'
export const selectCls =
  'apply-select w-full appearance-none rounded-[10px] border border-[#e5eaef] px-3.5 py-2.5 font-score text-[16px] text-[#1f2937] transition-colors focus:outline-none'

// select(드랍다운) 선택 상태 = 옵션 버튼과 동일 통일: bg 틴트 + accent 텍스트(테두리는 중립 고정). on = 값 선택됨.
export const selectTint = (accent: string, on: boolean) => ({ background: on ? accent + '12' : '#ffffff', color: on ? accent : '#1f2937' })

export const REGIONS = [
  '서울특별시', '부산광역시', '대구광역시', '인천광역시', '광주광역시', '대전광역시', '울산광역시',
  '세종특별자치시', '경기도', '강원특별자치도', '충청북도', '충청남도', '전북특별자치도', '전라남도',
  '경상북도', '경상남도', '제주특별자치도',
]

// 알게 된 경로(계획안 14번) — 필수X·중복선택.
export const ROUTE_OPTIONS = ['체육교육회 홈페이지', '교육청 연수원 게시글', '학교 내 공문', '지인 소개', '과거 참가자']

// 라벨 + 필수표시 + 힌트 래퍼.
export function Field({
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

// 다중선택 — 사각 체크 + 라벨. accent = 브랜드색.
export function CheckRow({ selected, onClick, label, accent }: { selected: boolean; onClick: () => void; label: string; accent: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex items-center gap-2.5 rounded-[10px] border border-[#e5eaef] px-3.5 py-2.5 text-left font-score text-[clamp(0.75rem,2.8cqi,0.875rem)] transition-colors"
      style={{ background: selected ? accent + '12' : '#ffffff', color: selected ? accent : '#4b5563' }}
    >
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center rounded-[4px] border"
        style={{ borderColor: selected ? accent : '#cbd2da', background: selected ? accent : '#ffffff' }}
      >
        {selected && (
          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
            <path d="M2.5 6.2l2.2 2.3L9.5 3.5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className="min-w-0 break-keep">{label}</span>
    </button>
  )
}

// 단일선택(라디오) — 원형 체크 + 라벨. accent = 브랜드색. 두 폼 gender 등 non-compact 라디오 공용.
// 도메인 축약(compact/top) 변형은 각 폼 로컬 OptionRow 유지 — 여기엔 기본형만.
export function RadioRow({ selected, onClick, label, accent }: { selected: boolean; onClick: () => void; label: string; accent: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className="flex w-full items-center gap-2.5 rounded-[10px] border border-[#e5eaef] px-3.5 py-2.5 text-left font-score text-[clamp(0.8125rem,3.4cqi,0.875rem)] transition-colors"
      style={{ background: selected ? accent + '12' : '#ffffff', color: selected ? accent : '#4b5563' }}
    >
      <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border" style={{ borderColor: selected ? accent : '#cbd2da' }}>
        {selected && <span className="h-2 w-2 rounded-full" style={{ background: accent }} />}
      </span>
      <span className="min-w-0 flex-1">{label}</span>
    </button>
  )
}

// 동의·확인 체크 — 네이티브 체크박스 + 설명. accent = 체크박스 색.
export function ConsentRow({
  checked, onChange, accent, children,
}: { checked: boolean; onChange: (v: boolean) => void; accent: string; children: React.ReactNode }) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 h-4 w-4 shrink-0" style={{ accentColor: accent }} />
      <Text variant="sub" className="text-[#4b5563]">{children}</Text>
    </label>
  )
}

// 차수 잔여 인원 배지 — 신청폼 차수 선택 여석 안내. avail 미확정(undefined)=표시 안 함.
// 3단계: 여유(그린) / 마감 임박(주황, 정원의 20% 이하) / 마감(앰버 — 소프트 정책상 '예비'로 접수).
export function SeatsLeft({ avail }: { avail: { remaining: number; capacity: number } | undefined }) {
  if (avail == null) return null
  const { remaining, capacity } = avail
  if (remaining <= 0) {
    return (
      <span className="inline-flex shrink-0 items-center whitespace-nowrap rounded-[4px] bg-[#eceff3] px-1.5 py-0.5 text-[10.5px] font-[600] leading-none text-[#9198a3]">
        마감 · 예비접수
      </span>
    )
  }
  // 마감 임박 = 정원의 20% 이하가 남았을 때.
  const low = remaining <= capacity * 0.2
  return (
    <span
      className="inline-flex shrink-0 items-center whitespace-nowrap text-[11px] font-[600] tabular-nums"
      style={{ color: low ? '#d97116' : '#2f803a' }}
    >
      잔여 {remaining}명{low && ' · 마감임박'}
    </span>
  )
}

// 정원 마감 차수 예비(대기) 신청 고지 + 필수 동의 — 선택한 차수가 마감일 때만 노출.
// 클레임 방지: '지금 신청 = 예비(대기)'임과 '입금은 편입 후'임을 제출 전에 명시적으로 확인받는다.
export function WaitlistNotice({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="mt-3 rounded-[10px] border border-[#f0d9a8] bg-[#fffaf0] p-3.5">
      <p className="text-[13px] font-[600] text-[#8a4b00]">선택하신 차수는 정원이 마감되었습니다</p>
      <p className="mt-1 text-[12.5px] font-[300] leading-relaxed text-[#6b5230]">
        지금 신청하시면 <b>예비(대기)</b>로 접수됩니다. 취소 발생 시 접수 순서대로 편입을 안내드리며,
        참가가 보장되지는 않습니다. <b>입금은 정원 편입(확정) 안내를 받으신 후</b> 진행해 주세요.
      </p>
      <label className="mt-2.5 flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-[#c2751a]"
        />
        <span className="text-[12.5px] font-[500] text-[#8a4b00]">예비(대기) 신청임을 확인했습니다.</span>
      </label>
    </div>
  )
}

// 알게 된 경로 그리드(다중선택).
export function RouteSelect({ routes, onToggle, accent }: { routes: string[]; onToggle: (r: string) => void; accent: string }) {
  return (
    <Field label="알게 된 경로" hint="중복 선택 가능 (선택)">
      {/* 콘텐츠 폭 유연 그리드(flex-wrap) — 라벨 길이만큼만 차지해 데스크탑 최대 4열·모바일 유동 배치, 반토막 강제 없음. */}
      <div className="flex flex-wrap gap-2">
        {ROUTE_OPTIONS.map((r) => (
          <CheckRow key={r} selected={routes.includes(r)} onClick={() => onToggle(r)} label={r} accent={accent} />
        ))}
      </div>
    </Field>
  )
}

// 개인정보 수집·이용/촬영 활용 고지문 — 스크롤 박스(정적, 두 폼 동일).
export function PrivacyConsentBox() {
  return (
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
  )
}

// 필수/선택 동의 체크 3종(고지 박스 아래). 문구 동일, accent 만 분기.
export function ConsentChecks({
  privacyConsent, confirmChecked, marketingOptIn, onPrivacy, onConfirm, onMarketing, accent,
}: {
  privacyConsent: boolean
  confirmChecked: boolean
  marketingOptIn: boolean
  onPrivacy: (v: boolean) => void
  onConfirm: (v: boolean) => void
  onMarketing: (v: boolean) => void
  accent: string
}) {
  return (
    <div className="space-y-3 rounded-[10px] border border-[#e5eaef] bg-white p-4">
      <ConsentRow checked={privacyConsent} onChange={onPrivacy} accent={accent}>
        <span className="text-[#c0685a]">[필수] </span>위 개인정보 수집·이용 및 촬영물 활용에 동의합니다.
      </ConsentRow>
      <ConsentRow checked={confirmChecked} onChange={onConfirm} accent={accent}>
        <span className="text-[#c0685a]">[필수] </span>신청 내용을 다시 확인했으며, 신청 성함과 입금자명이 일치하지 않으면 접수 확정이 늦어질 수 있음을 확인했습니다.
      </ConsentRow>
      <ConsentRow checked={marketingOptIn} onChange={onMarketing} accent={accent}>
        [선택] 추후 체육교육회의 프로그램 안내 연락을 받겠습니다.
      </ConsentRow>
    </div>
  )
}

// 입금자 확인 — 합계 박스 안(총금액 아래·신청 위). selfLabel = '대표 신청자'(자율)/'참가자'(직무).
export function PayerConfirm({
  payerDiffers, payerName, onToggle, onNameChange, accent, selfLabel,
}: {
  payerDiffers: boolean
  payerName: string
  onToggle: (v: boolean) => void
  onNameChange: (v: string) => void
  accent: string
  selfLabel: string
}) {
  return (
    <div className="mt-3 border-t border-[#e5eaef] pt-3">
      <label className="flex items-center gap-2">
        <input type="checkbox" checked={payerDiffers} onChange={(e) => onToggle(e.target.checked)} className="h-4 w-4" style={{ accentColor: accent }} />
        <Text variant="sub" className="text-[#4b5563]">입금자가 {selfLabel}와 다릅니다</Text>
      </label>
      {payerDiffers && (
        <input className={`${inputCls} mt-2`} value={payerName} onChange={(e) => onNameChange(e.target.value)} placeholder="입금자 성함" />
      )}
      <Text variant="caption" as="p" className="mt-1.5 text-[#9ca3af]">신청 성함과 입금자명이 다르면 접수 확정이 지연될 수 있습니다.</Text>
    </div>
  )
}

// 신청자 기본정보 공통 필드셋 — 직무(참가자)·자율(대표). 두 폼 구조 동일, 문구·접두어만 prop 분기.
// name/gender/phone/birthFront/schoolName/region 6필드는 두 폼 구조 공유(아래 ApplicantCore).
// 직무 전용 보험 토글·주민번호 뒷자리는 birthExtra 로 주입(도메인 로직은 각 폼 유지).
export interface ApplicantCore {
  name: string
  gender: '' | 'male' | 'female'
  phone: string
  birthFront: string
  schoolName: string
  region: string
}
// patch 객체 방식 — 각 폼의 Partial<Form> 세터가 구조적으로 그대로 할당됨(캐스팅 불필요). setSaved 초기화도 폼 세터가 담당.
export type ApplicantPatch = (patch: Partial<ApplicantCore>) => void

export function ApplicantFields({
  value, onChange, accent, personLabel = '', namePlaceholder, phoneHint, schoolPlaceholder, birthExtra,
}: {
  value: ApplicantCore
  onChange: ApplicantPatch
  accent: string
  personLabel?: string // '참가자 '(직무) / ''(자율) — 성함·성별·연락처·생년월일 라벨 접두어
  namePlaceholder: string
  phoneHint?: React.ReactNode
  schoolPlaceholder: string
  birthExtra?: React.ReactNode // 생년월일 입력 아래 추가 노드(직무 보험 토글 등)
}) {
  return (
    <>
      <Field label={`${personLabel}성함`} required>
        <input className={inputCls} value={value.name} onChange={(e) => onChange({ name: e.target.value })} placeholder={namePlaceholder} />
      </Field>

      <Field label={`${personLabel}성별`} required>
        <div className="grid grid-cols-2 gap-2">
          <RadioRow selected={value.gender === 'male'} onClick={() => onChange({ gender: 'male' })} label="남자" accent={accent} />
          <RadioRow selected={value.gender === 'female'} onClick={() => onChange({ gender: 'female' })} label="여자" accent={accent} />
        </div>
      </Field>

      <Field label={`${personLabel}연락처`} required hint={phoneHint}>
        <input
          className={inputCls}
          value={value.phone}
          onChange={(e) => onChange({ phone: e.target.value.replace(/\D/g, '').slice(0, 11) })}
          placeholder="01000000000 (- 없이 숫자만)"
          inputMode="numeric"
        />
      </Field>

      <Field label={`${personLabel}생년월일`} required hint="YYMMDD 6자리">
        <input
          className={inputCls}
          value={value.birthFront}
          onChange={(e) => onChange({ birthFront: e.target.value.replace(/\D/g, '').slice(0, 6) })}
          placeholder="YYMMDD"
          inputMode="numeric"
        />
        {birthExtra}
      </Field>

      <Field label="소속" required>
        <div className="grid grid-cols-2 gap-2">
          <input className={inputCls} value={value.schoolName} onChange={(e) => onChange({ schoolName: e.target.value })} placeholder={schoolPlaceholder} />
          <select className={selectCls} value={value.region} onChange={(e) => onChange({ region: e.target.value })} style={selectTint(accent, !!value.region)}>
            <option value="">지역 선택</option>
            {REGIONS.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>
      </Field>
    </>
  )
}

// 합계·액션 박스 — 라인아이템 + 총금액 + 입금자확인 + 제출에러 + 임시저장/신청 버튼. 두 폼 동일, emptyHint·accent·selfLabel만 분기.
// 신청 버튼은 accent 인라인 bg + hover:brightness-95 로 통일(직무·자율 동일 hover 거동). 합계 계산(lines/total/canSubmit)은 각 폼 도메인.
export function SummaryActions({
  lines, total, emptyHint, accent,
  payerDiffers, payerName, onTogglePayer, onPayerName, payerSelfLabel,
  submitError, saved, submitting, canSubmit, onSaveDraft, onSubmit,
}: {
  lines: { label: string; amount: number }[]
  total: number
  emptyHint: string
  accent: string
  payerDiffers: boolean
  payerName: string
  onTogglePayer: (v: boolean) => void
  onPayerName: (v: string) => void
  payerSelfLabel: string
  submitError: string | null
  saved: boolean
  submitting: boolean
  canSubmit: boolean
  onSaveDraft: () => void
  onSubmit: () => void
}) {
  return (
    <div className="mt-8 rounded-[12px] border border-[#e5eaef] bg-[#f7f9fb] p-4">
      {lines.length === 0 ? (
        <Text variant="sub" className="text-[#9ca3af]">{emptyHint}</Text>
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
      <PayerConfirm
        payerDiffers={payerDiffers}
        payerName={payerName}
        onToggle={onTogglePayer}
        onNameChange={onPayerName}
        accent={accent}
        selfLabel={payerSelfLabel}
      />
      {submitError && (
        <p className="mt-3 rounded-[8px] bg-[#fbecea] px-3 py-2 text-center font-score text-[13px] text-[#b4483a]">{submitError}</p>
      )}
      <div className="mt-4 grid grid-cols-[130px_1fr] gap-2">
        <button
          type="button"
          onClick={onSaveDraft}
          disabled={submitting}
          className={`rounded-[10px] border border-[#e5eaef] bg-white px-4 py-3 ${BTN} text-[#4b5563] transition-colors hover:bg-[#f2f5f9] disabled:opacity-40`}
        >
          {saved ? '저장됨 ✓' : '임시저장'}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={submitting || !canSubmit}
          className={`rounded-[10px] py-3 ${BTN} text-white transition-colors hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:brightness-100`}
          style={{ background: accent }}
        >
          {submitting ? '신청 중…' : '신청하기'}
        </button>
      </div>
    </div>
  )
}
