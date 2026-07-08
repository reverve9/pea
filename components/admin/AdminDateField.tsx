'use client'

import React, { useEffect, useState } from 'react'
import { adminFieldClass } from './AdminToolbar'

// 어드민 공용 날짜 입력 — 입력은 YYMMDD 6자리(예 250701), 표시는 YY/MM/DD(슬래시 자동 삽입).
// value = ISO 'YYYY-MM-DD'(또는 ''). 6자리 완성 시 20YY-MM-DD 로 상향 전달. 네이티브 date 안 씀(표기 통일).
// 규칙: 어드민 어디서든 날짜 입력은 이 컴포넌트로 통일한다. [[no-borders-rule]]

function isoToDigits(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  if (!y || !m || !d) return ''
  return `${y.slice(2)}${m}${d}`
}

// 숫자열 → YY/MM/DD 마스킹(입력 도중에도 슬래시 자동).
function mask(raw: string): string {
  const d = raw.replace(/\D/g, '').slice(0, 6)
  if (d.length <= 2) return d
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

export default function AdminDateField({
  value,
  onChange,
  className,
}: {
  value: string
  onChange: (iso: string) => void
  className?: string
}) {
  const [text, setText] = useState(() => mask(isoToDigits(value)))
  useEffect(() => setText(mask(isoToDigits(value))), [value])

  const handle = (rawInput: string) => {
    const digits = rawInput.replace(/\D/g, '').slice(0, 6)
    setText(mask(digits))
    if (digits.length === 0) onChange('')
    else if (digits.length === 6) onChange(`20${digits.slice(0, 2)}-${digits.slice(2, 4)}-${digits.slice(4, 6)}`)
  }

  return (
    <input
      value={text}
      onChange={(e) => handle(e.target.value)}
      inputMode="numeric"
      placeholder="YY/MM/DD"
      maxLength={8}
      className={className ?? `${adminFieldClass} w-[104px] tabular-nums placeholder:text-[#b0b6be]`}
    />
  )
}
