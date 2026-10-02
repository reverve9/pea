'use client'

import { useState } from 'react'
import Text from '@/components/common/Text'
import { lessonLevelLabel, equipmentLabel, JAYUL_LESSONS, EQUIPMENT_TYPES } from '@/lib/lessonOptions'
import { RENTAL_OPTIONS, JAYUL_APPAREL_SIZES, INFANT_APPAREL_SIZE } from '@/lib/rentalOptions'
import type { MyRosterParticipant, MyParticipantInput } from '@/lib/applicationTypes'

// 참가자 후속입력 슬롯 — 마이페이지(대표 대신입력)·셀프필 공개페이지(참가자 각자입력) 공용.
// 렌탈 옵션 귀속은 대표가 배정(잠금) → 여기선 배정된 옵션의 "사이즈"와 본인정보만 입력.
// 접힘 시 요약, 펼침 시 폼. birth_front 보유 = 입력완료. 주민번호 뒷자리 입력은 개인 보험 선택 폐지로 제거(3차 수정).

const fieldCls =
  'w-full rounded-[10px] border border-[#e5eaef] bg-white px-3.5 py-2.5 font-score text-[16px] text-[#1f2937] placeholder:text-[#b6bcc4] transition-colors focus:bg-[#f7f9fb] focus:outline-none'

type SizeState = { apparelSize: string; protectorSize: string; gloveSize: string }

export default function ParticipantFillSlot({
  part,
  open,
  onToggle,
  onSave,
  onSaved,
  onCopyLink,
  copyState = 'idle',
}: {
  part: MyRosterParticipant
  open: boolean
  onToggle: () => void
  onSave: (input: MyParticipantInput) => Promise<void>
  onSaved: () => void
  onCopyLink?: () => void // 있으면 우측에 '링크복사' 버튼 노출(대표 /my 전용)
  copyState?: 'idle' | 'busy' | 'copied'
}) {
  const [name, setName] = useState(part.name)
  const [phone, setPhone] = useState(part.phone ?? '')
  const [birthFront, setBirthFront] = useState(part.birth_front ?? '')
  const [gender, setGender] = useState(part.gender ?? '')
  const [lessonClass, setLessonClass] = useState(part.lesson_level ?? '')
  const [equipment, setEquipment] = useState(part.equipment ?? '')
  const [sizes, setSizes] = useState<SizeState>({
    apparelSize: part.apparel_size ?? '',
    protectorSize: part.protector_size ?? '',
    gloveSize: part.glove_size ?? '',
  })
  const [apparelNote, setApparelNote] = useState(part.apparel_note ?? '')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const filled = part.birth_front != null
  const label = part.is_leader ? '대표' : `참가자 ${part.sort_order + 1}`

  // 배정된 렌탈 옵션(대표가 정한 것) — 잠금 표시 + 사이즈 입력 대상.
  const assigned = RENTAL_OPTIONS.filter((o) => part[o.key])
  const rentalSummary = assigned
    .map((o) => {
      if (!o.sizeField) return o.label
      const sz = sizes[o.sizeField]
      return `${o.label}${sz ? `(${sz})` : ''}`
    })
    .join('·')

  const summary = [
    part.birth_front,
    part.lesson_level ? lessonLevelLabel(part.lesson_level) : null,
    part.equipment ? equipmentLabel(part.equipment) : null,
    rentalSummary || null,
  ]
    .filter(Boolean)
    .join(' · ')

  const setSize = (field: keyof SizeState, v: string) => setSizes((s) => ({ ...s, [field]: v }))

  const infant = part.apparel && sizes.apparelSize === INFANT_APPAREL_SIZE

  const save = async () => {
    setErr(null)
    if (infant && !apparelNote.trim()) {
      setErr('유아용 사이즈를 선택한 경우 특이사항에 사이즈를 기재해 주세요.')
      return
    }
    setSaving(true)
    try {
      await onSave({
        name,
        phone,
        birthFront,
        gender,
        lessonClass,
        equipment,
        apparelSize: sizes.apparelSize,
        apparelNote: part.apparel ? apparelNote : undefined,
        protectorSize: sizes.protectorSize,
        gloveSize: sizes.gloveSize,
      })
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-[10px] border border-[#e5eaef] bg-white">
      <div className="flex w-full items-center justify-between gap-2 px-3.5 py-3">
        <button type="button" onClick={onToggle} className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
          <span className="flex min-w-0 items-center gap-2">
            <Text variant="sub" className="shrink-0 text-[#8a94a0]">{label}</Text>
            <Text variant="label" className="truncate text-[#374151]">{part.name}</Text>
          </span>
          {!open && filled && summary && (
            <Text variant="caption" className="truncate tabular-nums text-[#9ca3af]">{summary}</Text>
          )}
        </button>
        <div className="flex shrink-0 items-center gap-2">
          {filled ? (
            <span className="rounded-full bg-[#eaf4ec] px-2 py-0.5 font-score text-[11px] text-[#2f803a]">입력완료</span>
          ) : (
            <span className="rounded-full bg-[#fbf3e6] px-2 py-0.5 font-score text-[11px] text-[#a9772a]">미입력</span>
          )}
          {onCopyLink && (
            <button type="button" onClick={onCopyLink} disabled={copyState === 'busy'} className="font-score text-[12px] text-[#3f6a99] hover:underline disabled:opacity-40">
              {copyState === 'copied' ? '복사됨' : '링크복사'}
            </button>
          )}
          <button type="button" onClick={onToggle} className="font-score text-[12px] text-[#9ca3af]">{open ? '접기' : filled ? '수정' : '입력'}</button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#eef1f4] px-3.5 pb-3.5 pt-3">
          <div className="grid grid-cols-2 gap-2">
            <input className={fieldCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="성함" />
            <input className={fieldCls} value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" placeholder="연락처" />
          </div>
          <div className="mt-2 grid grid-cols-2 gap-2">
            <input
              className={fieldCls}
              value={birthFront}
              onChange={(e) => setBirthFront(e.target.value.replace(/\D/g, '').slice(0, 6))}
              inputMode="numeric"
              placeholder="생년월일 (YYMMDD)"
            />
            <select className={fieldCls} value={gender} onChange={(e) => setGender(e.target.value)}>
              <option value="">성별 선택</option>
              <option value="male">남</option>
              <option value="female">여</option>
            </select>
          </div>
          <select className={`${fieldCls} mt-2`} value={lessonClass} onChange={(e) => setLessonClass(e.target.value)}>
            <option value="">기초강습 선택</option>
            {JAYUL_LESSONS.map((l) => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
          <select className={`${fieldCls} mt-2`} value={equipment} onChange={(e) => setEquipment(e.target.value)}>
            <option value="">용품세트(대여장비) 선택</option>
            {EQUIPMENT_TYPES.map((eq) => (
              <option key={eq.key} value={eq.key}>{eq.label}</option>
            ))}
          </select>

          {/* 배정된 렌탈 — 대표가 정한 옵션(잠금). 사이즈 있는 항목만 사이즈 입력. */}
          <div className="mt-3 rounded-[10px] border border-[#eef1f4] bg-[#f7f9fb] p-3">
            <Text variant="caption" className="text-[#8a94a0]">배정된 렌탈</Text>
            {assigned.length === 0 ? (
              <Text variant="caption" as="p" className="mt-1 text-[#9ca3af]">배정된 렌탈이 없습니다. (대표가 신청 시 배정)</Text>
            ) : (
              <div className="mt-2 space-y-2">
                {assigned.map((o) =>
                  o.sizeField && o.sizes ? (
                    <div key={o.key} className="flex items-center gap-2.5">
                      <span className="w-14 shrink-0 rounded-[6px] bg-[#e9eef4] px-2 py-1 text-center font-score text-[12px] text-[#4b5563]">{o.label}</span>
                      <select
                        className={fieldCls}
                        value={sizes[o.sizeField]}
                        onChange={(e) => setSize(o.sizeField as keyof SizeState, e.target.value)}
                      >
                        <option value="">{o.label} 사이즈 선택</option>
                        {/* 의류는 유아용 포함(자율 전용 — 이 슬롯은 자율패키지 참가자 입력에만 쓰임). */}
                        {(o.key === 'apparel' ? JAYUL_APPAREL_SIZES : o.sizes).map((s) => (
                          <option key={s} value={s}>
                            {s === INFANT_APPAREL_SIZE ? '유아용 (선택 후 특이사항에 기재해 주세요)' : s}
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <span key={o.key} className="mr-1.5 inline-block rounded-[6px] bg-[#e9eef4] px-2 py-1 font-score text-[12px] text-[#4b5563]">{o.label} (사이즈 없음)</span>
                  ),
                )}
              </div>
            )}
            {part.apparel && (
              <input
                className={`${fieldCls} mt-2`}
                value={apparelNote}
                onChange={(e) => setApparelNote(e.target.value.slice(0, 200))}
                placeholder={infant ? '특이사항 (필수) — 유아용 사이즈·키 등을 기재해 주세요' : '특이사항 (선택) — 사이즈 관련 요청사항'}
              />
            )}
          </div>

          {err && <p className="mt-2 rounded-[8px] bg-[#fbecea] px-3 py-2 font-score text-[13px] text-[#b4483a]">{err}</p>}
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="mt-2 w-full rounded-[10px] bg-[#1e3a5f] py-2.5 font-score text-[14px] font-[500] text-white transition-colors hover:bg-[#16304f] disabled:opacity-40"
          >
            {saving ? '저장 중…' : '저장'}
          </button>
        </div>
      )}
    </div>
  )
}
