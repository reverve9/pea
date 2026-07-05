'use client'

import { useState } from 'react'
import Text from '@/components/common/Text'
import { lessonLevelLabel, equipmentLabel, JAYUL_LESSONS, EQUIPMENT_TYPES } from '@/lib/lessonOptions'
import type { MyRosterParticipant, MyParticipantInput } from '@/lib/applicationTypes'

// 참가자 후속입력 슬롯 — 마이페이지(대표 대신입력)·셀프필 공개페이지(동반인 각자입력) 공용.
// 접힘 시 요약(입력완료/미입력), 펼침 시 폼. birth_front 보유 = 입력완료로 간주. 뒷자리는 write-only.
// onSave 는 네트워크 호출(실패 시 throw), 성공하면 뒷자리 클리어 후 onSaved(부모 새로고침).

const fieldCls =
  'w-full rounded-[10px] border border-[#e5eaef] bg-white px-3.5 py-2.5 font-score text-[16px] text-[#1f2937] placeholder:text-[#b6bcc4] transition-colors focus:bg-[#f7f9fb] focus:outline-none'

export default function ParticipantFillSlot({
  part,
  index,
  open,
  onToggle,
  onSave,
  onSaved,
}: {
  part: MyRosterParticipant
  index: number
  open: boolean
  onToggle: () => void
  onSave: (input: MyParticipantInput) => Promise<void>
  onSaved: () => void
}) {
  const [name, setName] = useState(part.name)
  const [phone, setPhone] = useState(part.phone ?? '')
  const [birthFront, setBirthFront] = useState(part.birth_front ?? '')
  const [gender, setGender] = useState(part.gender ?? '')
  const [lessonClass, setLessonClass] = useState(part.lesson_level ?? '')
  const [equipment, setEquipment] = useState(part.equipment ?? '')
  const [apparelSize, setApparelSize] = useState(part.apparel_size ?? '')
  const [birthBack, setBirthBack] = useState('')
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const filled = part.birth_front != null
  const label = part.is_leader ? '대표' : `동반 ${index + 1}`
  const summary = [
    part.birth_front,
    part.lesson_level ? lessonLevelLabel(part.lesson_level) : null,
    part.equipment ? equipmentLabel(part.equipment) : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const save = async () => {
    setErr(null)
    setSaving(true)
    try {
      await onSave({ name, phone, birthFront, gender, birthBack, lessonClass, equipment, apparelSize })
      setBirthBack('') // write-only — 저장 후 잔존 방지
      onSaved()
    } catch (e) {
      setErr(e instanceof Error ? e.message : '저장 중 오류가 발생했습니다.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="rounded-[10px] border border-[#e5eaef] bg-white">
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-2 px-3.5 py-3 text-left">
        <span className="flex min-w-0 flex-col gap-0.5">
          <span className="flex min-w-0 items-center gap-2">
            <Text variant="sub" className="shrink-0 text-[#8a94a0]">{label}</Text>
            <Text variant="label" className="truncate text-[#374151]">{part.name}</Text>
          </span>
          {!open && filled && summary && (
            <Text variant="caption" className="truncate tabular-nums text-[#9ca3af]">{summary}</Text>
          )}
        </span>
        <span className="flex shrink-0 items-center gap-2">
          {filled ? (
            <span className="rounded-full bg-[#eaf4ec] px-2 py-0.5 font-score text-[11px] text-[#2f803a]">입력완료</span>
          ) : (
            <span className="rounded-full bg-[#fbf3e6] px-2 py-0.5 font-score text-[11px] text-[#a9772a]">미입력</span>
          )}
          <span className="font-score text-[12px] text-[#9ca3af]">{open ? '접기' : filled ? '수정' : '입력'}</span>
        </span>
      </button>

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
          <div className="mt-2 grid grid-cols-2 gap-2">
            <select className={fieldCls} value={equipment} onChange={(e) => setEquipment(e.target.value)}>
              <option value="">대여장비 선택</option>
              {EQUIPMENT_TYPES.map((eq) => (
                <option key={eq.key} value={eq.key}>{eq.label}</option>
              ))}
            </select>
            <input
              className={fieldCls}
              value={apparelSize}
              onChange={(e) => setApparelSize(e.target.value)}
              placeholder="의류 사이즈 (예: 95, L)"
            />
          </div>
          {part.has_insurance && (
            <Text variant="caption" as="p" className="mt-2 text-[#2f803a]">주민번호 뒷자리가 등록되어 있습니다. 새로 입력하면 교체됩니다.</Text>
          )}
          <input
            className={`${fieldCls} mt-2`}
            value={birthBack}
            onChange={(e) => setBirthBack(e.target.value.replace(/\D/g, '').slice(0, 7))}
            inputMode="numeric"
            placeholder="주민번호 뒷자리 (보험 가입 시 · 7자리)"
          />
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
