'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Lock, PenLine, Info, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import { EmptyState } from '@/components/common/StateView'
import Pagination from '@/components/common/Pagination'
import { formatDate } from '@/lib/display'
import {
  createInquiry,
  getInquiries,
  openInquiry,
  type InquiryListItem,
  type InquiryDetail,
} from '@/lib/inquiries'

// §3-5 1:1 문의 — 비밀 게시판. 작성(anon INSERT) + 리스트(inquiries_public 뷰) + 행 인라인 비번 열람(RPC).
// 열람 = 작성 시 설정한 비밀번호로만(휴대폰 인증 불필요). 신청확인·입금확인은 마이페이지(OTP) 소관.

// ⚠ 안내 문구 placeholder — 실제 정책 확정 후 교체.
const GUIDE: { label: string; text: string }[] = [
  { label: '신청 확인', text: '내 신청 내역은 마이페이지에서 전화번호 인증 후 바로 조회할 수 있습니다.' },
  { label: '입금 확인', text: '입금 확인 여부도 마이페이지에서 전화번호 인증 후 확인할 수 있습니다.' },
  { label: '환불', text: '개강 전 취소는 규정에 따라 환불됩니다. 개강 후에는 진행 일정에 따라 부분 환불될 수 있습니다.' },
]

const EMPTY = { name: '', phone: '', title: '', content: '', password: '' }

export default function InquiryBoardShell() {
  // 작성 폼
  const [writing, setWriting] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')

  // 리스트 + 열람
  const [items, setItems] = useState<InquiryListItem[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [isMobile, setIsMobile] = useState(false)
  const [page, setPage] = useState(1)
  const [openId, setOpenId] = useState<string | null>(null)
  const [pw, setPw] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [verifyError, setVerifyError] = useState(false)
  const [unlocked, setUnlocked] = useState<Record<string, InquiryDetail>>({})

  const loadList = useCallback(async () => {
    setLoadingList(true)
    const data = await getInquiries()
    setItems(data)
    setLoadingList(false)
  }, [])

  useEffect(() => {
    loadList()
    const check = () => setIsMobile(window.innerWidth < 768)
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [loadList])

  const pageSize = isMobile ? 3 : 5
  useEffect(() => {
    setPage(1)
  }, [pageSize])

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize))
  const paged = items.slice((page - 1) * pageSize, page * pageSize)

  const set = (k: keyof typeof EMPTY) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const canSubmit =
    !!form.phone.trim() && !!form.title.trim() && !!form.content.trim() && !!form.password && !submitting

  async function submit() {
    if (!canSubmit) return
    setSubmitting(true)
    setError('')
    try {
      await createInquiry(form)
      setForm(EMPTY)
      setWriting(false)
      setDone(true)
      loadList()
    } catch (err) {
      console.error('[inquiry] submit failed:', err)
      setError('제출에 실패했습니다. 잠시 후 다시 시도해 주세요.')
    } finally {
      setSubmitting(false)
    }
  }

  function toggleRow(id: string) {
    setOpenId((cur) => (cur === id ? null : id))
    setPw('')
    setVerifyError(false)
  }

  async function verify(id: string) {
    if (!pw) return
    setVerifying(true)
    setVerifyError(false)
    const detail = await openInquiry(id, pw)
    if (detail) {
      setUnlocked((u) => ({ ...u, [id]: detail }))
      setPw('')
    } else {
      setVerifyError(true)
    }
    setVerifying(false)
  }

  return (
    <div className="space-y-4">
      {/* 문의 전 확인 안내 */}
      <div className="rounded-[12px] border border-[#e5ecf2] bg-[#f3f6f9] p-4">
        <div className="flex items-center gap-1.5">
          <Info size={15} className="text-[#1e3a5f]" />
          <span className="text-[13px] font-[500] text-[#1e3a5f]">문의 전에 확인하세요</span>
        </div>
        <div className="mt-2.5 space-y-2">
          {GUIDE.map((g) => (
            <div key={g.label} className="flex gap-2.5">
              <span className="mt-[1px] shrink-0 rounded-[5px] bg-white px-1.5 py-[2px] text-[11px] font-[500] text-[#3f6a99] ring-1 ring-[#dbe4ee]">
                {g.label}
              </span>
              <p className="text-[12.5px] font-[300] leading-relaxed text-[#4b5563]">{g.text}</p>
            </div>
          ))}
        </div>
      </div>

      {/* 접수 완료 안내 */}
      {done && (
        <div className="flex items-center gap-2 rounded-[10px] border border-[#cfe6d8] bg-[#f0f8f3] px-4 py-3">
          <CheckCircle2 size={16} className="shrink-0 text-[#2f7d5a]" />
          <p className="text-[13px] font-[400] text-[#2f7d5a]">
            문의가 접수되었습니다. 답변은 작성 시 설정한 비밀번호로 열람할 수 있습니다.
          </p>
        </div>
      )}

      {/* 헤더 + 작성 토글 */}
      <div className="flex items-start justify-between gap-3 px-1">
        <div className="min-w-0">
          <h3 className="text-[14.5px] font-[500] text-[#1f2937]">1:1 문의</h3>
          <p className="mt-0.5 text-[12.5px] font-[300] text-[#6b7280]">
            연수 · 신청 · 환불 등 궁금한 점을 문의합니다.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setWriting((v) => !v)
            setDone(false)
          }}
          className="flex shrink-0 items-center gap-1.5 rounded-[8px] bg-[#1e3a5f] px-3 py-2 text-[13px] font-[500] text-white transition-opacity hover:opacity-90"
        >
          <PenLine size={14} />
          문의 작성
        </button>
      </div>

      {/* 작성 폼 아코디언 */}
      {writing && (
        <div className="rounded-[12px] border border-[#e5e7eb] bg-white p-4">
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2.5">
              <Field label="이름" placeholder="이름" value={form.name} onChange={set('name')} />
              <Field label="연락처" placeholder="010-0000-0000" value={form.phone} onChange={set('phone')} />
            </div>
            <Field label="제목" placeholder="제목" value={form.title} onChange={set('title')} />
            <TextareaField
              label="내용"
              placeholder="문의 내용을 적어주세요."
              value={form.content}
              onChange={set('content')}
            />
            <Field
              label="열람용 비밀번호"
              placeholder="답변 열람 시 사용할 비밀번호"
              type="password"
              value={form.password}
              onChange={set('password')}
            />
          </div>

          {error && <p className="mt-2 text-[12px] font-[300] text-[#c0392b]">{error}</p>}

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="flex items-center gap-1 text-[11.5px] font-[300] text-[#9ca3af]">
              <Lock size={12} />
              비밀글로 보호됩니다.
            </p>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="rounded-[8px] bg-[#1e3a5f] px-4 py-2 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {submitting ? '제출 중…' : '제출'}
            </button>
          </div>
        </div>
      )}

      {/* 문의 내역 — 공지 리스트와 동일 스타일(박스 없음, divide-y) + 페이지네이션(5/3) */}
      <div>
        <div className="flex items-center justify-between gap-2 px-1 pb-1">
          <span className="text-[13px] font-[500] tracking-[0.3px] text-[#6b7280]">문의 내역</span>
          <Pagination page={page} totalPages={totalPages} onChange={setPage} />
        </div>

        {loadingList ? (
          <p className="py-6 text-center text-[13px] font-[300] text-[#9ca3af]">불러오는 중…</p>
        ) : items.length === 0 ? (
          <EmptyState label="등록된 문의가 없습니다." icon={<Lock className="h-8 w-8" />} />
        ) : (
          <ul className="divide-y divide-[#eef1f5] border-y border-[#eef1f5]">
            {paged.map((it) => {
              const open = openId === it.id
              const detail = unlocked[it.id]
              return (
                <li key={it.id}>
                  <button
                    onClick={() => toggleRow(it.id)}
                    className={[
                      'flex w-full items-center gap-2 px-1 py-3 text-left transition-colors',
                      open ? 'bg-[#f1f6fb]' : 'hover:bg-[#f7f9fb]',
                    ].join(' ')}
                  >
                    <Lock size={12} className="shrink-0 text-[#9ca3af]" />
                    <span className="shrink-0 text-[12.5px] font-[400] text-[#374151]">{it.name ?? '익명'}</span>
                    <span className="min-w-0 flex-1 truncate text-[13.5px] font-[400] text-[#1f2937]">
                      {it.title}
                    </span>
                    <Badge color={it.status === 'answered' ? 'emerald' : 'slate'} size="sm" className="shrink-0">
                      {it.status === 'answered' ? '답변완료' : '답변대기'}
                    </Badge>
                    <span className="shrink-0 text-[11.5px] font-[300] tabular-nums text-[#9ca3af]">
                      {formatDate(it.created_at.slice(0, 10))}
                    </span>
                  </button>

                  {open && (
                    <div className="px-1 pb-3">
                      {detail ? (
                        <div className="rounded-[8px] border border-[#eef1f5] bg-white p-3.5">
                          <p className="whitespace-pre-wrap text-[13px] font-[300] leading-relaxed text-[#374151]">
                            {detail.content}
                          </p>
                          <div className="mt-3 border-t border-[#f0f1f3] pt-3">
                            <p className="mb-1 text-[12px] font-[500] text-[#1e3a5f]">답변</p>
                            {detail.admin_reply ? (
                              <p className="whitespace-pre-wrap text-[13px] font-[300] leading-relaxed text-[#4b5563]">
                                {detail.admin_reply}
                              </p>
                            ) : (
                              <p className="text-[12.5px] font-[300] text-[#9ca3af]">
                                아직 답변이 등록되지 않았습니다.
                              </p>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[8px] bg-[#f7f9fb] p-3">
                          <p className="mb-2 flex items-center gap-1 text-[12px] font-[300] text-[#6b7280]">
                            <Lock size={12} />
                            비밀글입니다. 열람용 비밀번호를 입력하세요.
                          </p>
                          <div className="flex gap-2">
                            <input
                              type="password"
                              value={pw}
                              onChange={(e) => {
                                setPw(e.target.value)
                                setVerifyError(false)
                              }}
                              onKeyDown={(e) => e.key === 'Enter' && verify(it.id)}
                              placeholder="비밀번호"
                              className="min-w-0 flex-1 rounded-[8px] border border-[#e2e5e9] bg-white px-3 py-2 text-[13.5px] text-[#1f2937] outline-none transition-colors placeholder:text-[#b0b6be] focus:border-[#1e3a5f]"
                            />
                            <button
                              type="button"
                              onClick={() => verify(it.id)}
                              disabled={!pw || verifying}
                              className="shrink-0 rounded-[8px] bg-[#1e3a5f] px-4 py-2 text-[13px] font-[500] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                            >
                              {verifying ? '확인 중…' : '열람'}
                            </button>
                          </div>
                          {verifyError && (
                            <p className="mt-1.5 text-[12px] font-[300] text-[#c0392b]">
                              비밀번호가 일치하지 않습니다.
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

function Field({
  label,
  placeholder,
  type = 'text',
  value,
  onChange,
}: {
  label: string
  placeholder?: string
  type?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-[400] text-[#6b7280]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-[8px] border border-[#e2e5e9] bg-white px-3 py-2 text-[13.5px] text-[#1f2937] outline-none transition-colors placeholder:text-[#b0b6be] focus:border-[#1e3a5f]"
      />
    </label>
  )
}

function TextareaField({
  label,
  placeholder,
  value,
  onChange,
}: {
  label: string
  placeholder?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-[12px] font-[400] text-[#6b7280]">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full resize-none rounded-[8px] border border-[#e2e5e9] bg-white px-3 py-2 text-[13.5px] text-[#1f2937] outline-none transition-colors placeholder:text-[#b0b6be] focus:border-[#1e3a5f]"
      />
    </label>
  )
}
