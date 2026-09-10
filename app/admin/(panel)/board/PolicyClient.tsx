'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Upload } from 'lucide-react'
import { adminFieldClass } from '@/components/admin/AdminToolbar'
import { savePolicy } from './policyActions'
import { PRIVACY_KEY } from './policyKeys'

// 개인정보처리방침 편집 — 문서 한 장이라 목록/모달 없이 본문 편집기 하나.
// 입력 경로 둘: (a) 텍스트 붙여넣기 (b) .txt/.md 파일 올려 본문 채우기(길어서 붙여넣기 번거로운 경우).
// 저장 = site_contents(privacy_policy).body 덮어쓰기 → 공개 /privacy 가 그대로 렌더.
export default function PolicyClient({ body }: { body: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [text, setText] = useState(body)
  const [saved, setSaved] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const dirty = text.trim() !== body.trim()

  const onFile = (file: File | undefined) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      setText(String(reader.result ?? ''))
      setSaved(false)
    }
    reader.readAsText(file, 'utf-8')
  }

  const save = () => {
    if (!dirty || pending) return
    startTransition(async () => {
      const res = await savePolicy(PRIVACY_KEY, text)
      if (res.ok) {
        setSaved(true)
        router.refresh()
      } else alert(res.error)
    })
  }

  return (
    <div className="rounded-[12px] bg-white p-5 shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-[12.5px] font-[300] leading-relaxed text-[#6b7280]">
          저장하면 홈페이지 하단 <span className="font-[500] text-[#374151]">개인정보처리방침</span> 페이지에 바로 반영됩니다.
          문단은 빈 줄로 나누고, 소제목은 <span className="font-[500] text-[#374151]">## 제목</span> 형태로 쓰면 제목으로 표시됩니다.
        </p>
        <div className="flex shrink-0 items-center gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".txt,.md,text/plain,text/markdown"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex items-center gap-1.5 rounded-[8px] bg-[#eef1f4] px-3 py-1.5 text-[12px] font-[500] text-[#4b5563] transition-colors hover:bg-[#e4e8ec]"
          >
            <Upload size={13} />
            파일 불러오기
          </button>
        </div>
      </div>

      <textarea
        value={text}
        onChange={(e) => {
          setText(e.target.value)
          setSaved(false)
        }}
        rows={22}
        placeholder="개인정보처리방침 전문을 붙여넣거나 파일을 불러오세요."
        className={`${adminFieldClass} w-full resize-y bg-[#f5f7fa] p-3.5 text-[13px] leading-[1.75] placeholder:text-[#b0b6be]`}
      />

      <div className="mt-4 flex items-center justify-end gap-3">
        {saved && !dirty && <span className="text-[12px] font-[400] text-[#0f5a3c]">저장되었습니다</span>}
        {dirty && <span className="text-[12px] font-[400] text-[#8a4b00]">저장하지 않은 변경이 있습니다</span>}
        <button
          type="button"
          disabled={!dirty || pending}
          onClick={save}
          className="flex items-center gap-1.5 rounded-[9px] bg-[#1e3a5f] px-5 py-2.5 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Save size={14} />
          {pending ? '저장 중…' : '저장'}
        </button>
      </div>
    </div>
  )
}
