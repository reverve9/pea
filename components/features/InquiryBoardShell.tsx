'use client'

import React, { useState, useEffect, useCallback } from 'react'
import { Lock, PenLine, Info, ChevronDown } from 'lucide-react'
import { Badge } from '@/components/common/Badge'
import Text, { BTN } from '@/components/common/Text'
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

// openPulse: 좌 문의 카드 클릭 시 부모가 증가시키는 신호 — 값이 바뀌면 문의 내역 아코디언을 토글한다.
export default function InquiryBoardShell({ openPulse, hideHeader }: { openPulse?: number; hideHeader?: boolean }) {
  // 작성 폼
  const [writing, setWriting] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  // 리스트 + 열람
  const [items, setItems] = useState<InquiryListItem[]>([])
  const [loadingList, setLoadingList] = useState(true)
  const [listOpen, setListOpen] = useState(false)
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
  }, [loadList])

  // 좌 문의 카드 클릭(펄스) → 문의 내역 토글(다시 누르면 닫힘).
  useEffect(() => {
    if (openPulse) setListOpen((v) => !v)
  }, [openPulse])

  const pageSize = 5
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
          <Text variant="card-title-sm">문의 전에 확인하세요</Text>
        </div>
        <div className="mt-2.5 space-y-2">
          {GUIDE.map((g) => (
            <div key={g.label} className="flex items-start gap-2.5">
              <span className="mt-[1px] shrink-0 rounded-[5px] bg-white px-1.5 py-[2px] text-[clamp(0.5625rem,2.2cqi,0.6875rem)] font-[500] text-[#3f6a99] ring-1 ring-[#dbe4ee]">
                {g.label}
              </span>
              <Text as="p" variant="sub" className="leading-relaxed">{g.text}</Text>
            </div>
          ))}
        </div>
      </div>

      {/* 헤더 + 작성 토글 — 모바일: 세로 스택 + 풀폭 버튼 / 데스크탑(md↑): 우측 인라인 버튼 */}
      <div className={`flex flex-col gap-3 px-1 md:flex-row md:items-start md:justify-between ${hideHeader ? 'md:justify-end' : ''}`}>
        {!hideHeader && (
          <div className="min-w-0">
            <Text as="h3" variant="card-title-sm">1:1 문의</Text>
            <Text as="p" variant="caption" className="mt-1 leading-relaxed">
              연수 · 신청 · 환불 등 궁금한 점을 문의합니다.
              <br />
              답변은 작성 시 설정한 비밀번호로 열람할 수 있습니다.
            </Text>
          </div>
        )}
        <button
          type="button"
          onClick={() => setWriting((v) => !v)}
          className={`flex w-full shrink-0 items-center justify-center gap-1.5 rounded-[8px] bg-[#1e3a5f] px-3 py-2.5 ${BTN} text-white transition-opacity hover:opacity-90 md:w-auto md:justify-start md:py-2`}
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
              <Field label="연락처" placeholder="01000000000 (- 없이 숫자만)" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, '').slice(0, 11) }))} />
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

          {error && <Text as="p" variant="caption" color="#c0392b" className="mt-2">{error}</Text>}

          <div className="mt-3 flex items-center justify-between gap-2">
            <Text as="p" variant="caption" color="#9ca3af" className="flex items-center gap-1">
              <Lock size={12} />
              비밀글로 보호됩니다.
            </Text>
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className={`rounded-[8px] bg-[#1e3a5f] px-4 py-2 ${BTN} text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40`}
            >
              {submitting ? '제출 중…' : '제출'}
            </button>
          </div>
        </div>
      )}

      {/* 문의 내역 — 아코디언(기본 닫힘, 헤더/좌 문의 카드 클릭 시 열림). FAQ 아코디언과 동일 톤. */}
      <div className="overflow-hidden rounded-[10px] border border-[#e5eaef] bg-[#f2f5f9]">
        <button
          type="button"
          onClick={() => setListOpen((v) => !v)}
          className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left"
          aria-expanded={listOpen}
        >
          <Text variant="card-title-sm">문의 내역</Text>
          <ChevronDown
            size={16}
            className={`shrink-0 text-[#9ca3af] transition-transform ${listOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {listOpen && (
          <div className="border-t border-[#e5eaef] bg-white px-4 pb-3 pt-3">
            {loadingList ? (
              <Text as="p" variant="sub" color="#9ca3af" className="py-6 text-center">불러오는 중…</Text>
            ) : items.length === 0 ? (
              <EmptyState label="등록된 문의가 없습니다." icon={<Lock className="h-8 w-8" />} />
            ) : (
              <>
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
                    <Text variant="sub" className="shrink-0">{it.name ?? '익명'}</Text>
                    <Text variant="card-title-sm" className="min-w-0 flex-1 truncate">
                      {it.title}
                    </Text>
                    <Badge color={it.status === 'answered' ? 'emerald' : 'slate'} size="sm" className="shrink-0">
                      {it.status === 'answered' ? '답변완료' : '답변대기'}
                    </Badge>
                    <Text variant="date" className="shrink-0">
                      {formatDate(it.created_at.slice(0, 10))}
                    </Text>
                  </button>

                  {open && (
                    <div className="px-1 pb-3">
                      {detail ? (
                        <div className="rounded-[8px] border border-[#eef1f5] bg-white p-3.5">
                          <Text as="p" variant="sub" className="whitespace-pre-wrap leading-relaxed">
                            {detail.content}
                          </Text>
                          <div className="mt-3 border-t border-[#f0f1f3] pt-3">
                            <Text as="p" variant="label" color="#1e3a5f" className="mb-1">답변</Text>
                            {detail.admin_reply ? (
                              <Text as="p" variant="sub" className="whitespace-pre-wrap leading-relaxed">
                                {detail.admin_reply}
                              </Text>
                            ) : (
                              <Text as="p" variant="sub" color="#9ca3af">
                                아직 답변이 등록되지 않았습니다.
                              </Text>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="rounded-[8px] bg-[#f7f9fb] p-3">
                          <Text as="p" variant="caption" color="#6b7280" className="mb-2 flex items-center gap-1">
                            <Lock size={12} />
                            비밀글입니다. 열람용 비밀번호를 입력하세요.
                          </Text>
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
                              className="min-w-0 flex-1 rounded-[8px] border border-[#e2e5e9] bg-white px-3 py-2 text-[clamp(0.6875rem,2.6cqi,0.84375rem)] text-[#1f2937] outline-none transition-colors placeholder:text-[#b0b6be] focus:bg-[#f7f9fb]"
                            />
                            <button
                              type="button"
                              onClick={() => verify(it.id)}
                              disabled={!pw || verifying}
                              className={`shrink-0 rounded-[8px] bg-[#1e3a5f] px-4 py-2 ${BTN} text-white transition-opacity hover:opacity-90 disabled:opacity-40`}
                            >
                              {verifying ? '확인 중…' : '열람'}
                            </button>
                          </div>
                          {verifyError && (
                            <Text as="p" variant="caption" color="#c0392b" className="mt-1.5">
                              비밀번호가 일치하지 않습니다.
                            </Text>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </li>
              )
            })}
                </ul>
                <Pagination page={page} totalPages={totalPages} onChange={setPage} />
              </>
            )}
          </div>
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
      <span className="mb-1 block text-[clamp(0.625rem,2.4cqi,0.75rem)] font-[400] text-[#6b7280]">{label}</span>
      <input
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full rounded-[8px] border border-[#e2e5e9] bg-white px-3 py-2 text-[clamp(0.6875rem,2.6cqi,0.84375rem)] text-[#1f2937] outline-none transition-colors placeholder:text-[#b0b6be] focus:bg-[#f7f9fb]"
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
      <span className="mb-1 block text-[clamp(0.625rem,2.4cqi,0.75rem)] font-[400] text-[#6b7280]">{label}</span>
      <textarea
        rows={4}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="w-full resize-none rounded-[8px] border border-[#e2e5e9] bg-white px-3 py-2 text-[clamp(0.6875rem,2.6cqi,0.84375rem)] text-[#1f2937] outline-none transition-colors placeholder:text-[#b0b6be] focus:bg-[#f7f9fb]"
      />
    </label>
  )
}
