'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { ClipboardList } from 'lucide-react'
import Text from '@/components/common/Text'
import ParticipantFillSlot from '@/components/features/ParticipantFillSlot'
import { fetchFillRoster, submitFillParticipant } from '@/lib/applyClient'
import type { MyRosterParticipant, RosterSummary } from '@/lib/applicationTypes'

// 셀프필 공개페이지 — 대표가 단톡 공유한 링크로 참가자가 각자 본인 정보 입력.
// 마이 세션 불필요(링크 토큰이 크리덴셜). 뒷자리 write-only. [[companion-detail-post-signup-fill]]
export default function FillPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token ?? ''
  const [roster, setRoster] = useState<MyRosterParticipant[] | null>(null)
  const [summary, setSummary] = useState<RosterSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  const load = async () => {
    setError(null)
    try {
      const r = await fetchFillRoster(token)
      setRoster(r.roster)
      setSummary(r.summary)
    } catch (e) {
      setError(e instanceof Error ? e.message : '참가자 정보를 불러오지 못했습니다.')
      setRoster([])
    }
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const r = await fetchFillRoster(token)
        if (!cancelled) {
          setRoster(r.roster)
          setSummary(r.summary)
        }
      } catch (e) {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : '참가자 정보를 불러오지 못했습니다.')
          setRoster([])
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token])

  return (
    <main className="min-h-screen bg-[#f4f6f8] px-4 py-8">
      <div className="mx-auto w-full max-w-[460px]">
        <div className="mb-4 flex items-center gap-2.5">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#eef2f7]">
            <ClipboardList size={20} className="text-[#1e3a5f]" />
          </span>
          <div>
            <Text variant="card-title" as="h1">참가자 정보 입력</Text>
            {summary && <Text variant="caption" className="text-[#8a94a0]">{summary.applicant_name} 님 신청 · {summary.track_label}</Text>}
          </div>
        </div>

        <div className="rounded-[14px] bg-white p-5 shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
          {summary && (
            <div className="mb-4 rounded-[10px] bg-[#f7f9fb] px-4 py-3">
              <Text variant="sub" as="p" className="text-[#4b5563]">{summary.track_label}</Text>
              {summary.period && <Text variant="caption" as="p" className="mt-0.5 text-[#8a94a0]">{summary.period}</Text>}
            </div>
          )}
          <Text variant="caption" as="p" className="mb-3 text-[#9ca3af]">
            본인 정보(성별 · 생년월일 · 기초강습 · 대여장비)를 입력해 주세요. 보험 가입자는 주민번호 뒷자리도 필요하며, 서버에서 암호화되어 저장됩니다. 이 링크는 본인 정보 입력 전용입니다.
          </Text>

          {roster === null ? (
            <Text variant="caption" as="p" className="py-6 text-center text-[#9ca3af]">불러오는 중…</Text>
          ) : error ? (
            <div className="rounded-[10px] bg-[#fbecea] px-4 py-6 text-center">
              <Text variant="sub" as="p" className="text-[#b4483a]">{error}</Text>
              <Text variant="caption" as="p" className="mt-1 text-[#c0685a]">링크가 만료되었거나 올바르지 않습니다. 대표자에게 링크를 다시 요청해 주세요.</Text>
            </div>
          ) : (
            <div className="space-y-2">
              {roster.map((p) => (
                <ParticipantFillSlot
                  key={p.id}
                  part={p}
                  open={openId === p.id}
                  onToggle={() => setOpenId((o) => (o === p.id ? null : p.id))}
                  onSave={(input) => submitFillParticipant(token, p.id, input)}
                  onSaved={() => {
                    setOpenId(null)
                    load()
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <Text variant="caption" as="p" className="mt-4 text-center text-[#b6bcc4]">체육교육회 · 이 링크는 참가자 정보 입력 전용입니다.</Text>
      </div>
    </main>
  )
}
