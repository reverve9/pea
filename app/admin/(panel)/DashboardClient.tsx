'use client'

import React, { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import AdminTabs from '@/components/admin/AdminTabs'
import { formatKRW, formatPeriod, SCHEDULE_TYPE } from '@/lib/display'
import { lessonLevelLabel } from '@/lib/lessonOptions'
import { kstDate } from '@/lib/settlement'
import { netAmount } from '@/lib/refundMath'
import type {
  ApplicationAdmin,
  SessionAdmin,
  RefundStatus,
  ModificationStatus,
  InquiryStatus,
} from '@/lib/types'

// 어드민 대시보드 — 처리 대기(바로가기) → 핵심 지표 → 차수별 현황 → 신청 추이 → 참가자 구성.
// 금액 기준은 정산 관리와 동일: 입금확정 매출 = 받은 돈(total − 미수 추가입금 + 수정 감액분) − 환불 합계(lib/refundMath).
// 정원 점유 = pending·paid·completed(예비 제외) — lib/capacity 와 동일 정책(SessionAdmin.occupied 사용).

type KindFilter = 'all' | 'jikmu' | 'jayul'

const NAVY = '#1e3a5f'
const CARD = 'rounded-[12px] bg-white shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]'
const ACTIVE = new Set(['pending', 'paid', 'completed'])
const DEPOSITED = new Set(['paid', 'completed', 'refunded'])

const sessionKind = (s: SessionAdmin): 'jikmu' | 'jayul' => (s.schedule_type === 'jikmu' ? 'jikmu' : 'jayul')
const netDeposit = (a: ApplicationAdmin) => (DEPOSITED.has(a.status) ? netAmount(a) : 0)
// 미입금 = 입금대기 신청 전액 + 입금확정 건의 미수 추가입금.
const unpaid = (a: ApplicationAdmin) => (a.status === 'pending' ? a.total_amount : ACTIVE.has(a.status) ? a.due_amount : 0)
const missingInfo = (a: ApplicationAdmin) =>
  a.kind === 'jayul' && ACTIVE.has(a.status) ? a.participants.filter((p) => !p.birth_front).length : 0

function dDay(startsOn: string, today: string): string {
  const diff = Math.round((Date.parse(startsOn) - Date.parse(today)) / 86_400_000)
  return diff > 0 ? `D-${diff}` : diff === 0 ? 'D-day' : '종료'
}

// 렌탈 수량 — 직무는 참가자 rentals 플래그, 자율은 신청 시 구매 수량(rental_qty).
function rentalCounts(a: ApplicationAdmin) {
  if (a.kind === 'jayul') return a.rental_qty
  const r = a.participants[0]?.rentals ?? {}
  return { apparel: r.apparel ? 1 : 0, goggle: r.goggle ? 1 : 0, protector: r.protector ? 1 : 0, glove: r.glove ? 1 : 0 }
}

export default function DashboardClient({
  applications,
  sessions,
  refunds,
  modifications,
  inquiries,
}: {
  applications: ApplicationAdmin[]
  sessions: SessionAdmin[]
  refunds: { status: RefundStatus }[]
  modifications: { status: ModificationStatus }[]
  inquiries: { status: InquiryStatus }[]
}) {
  const [kind, setKind] = useState<KindFilter>('all')
  const [includePast, setIncludePast] = useState(false)
  const today = kstDate(new Date().toISOString())

  // 차수 범위: 유형 + (기본) 종료일이 오늘 이후인 차수만. 신청 집계도 같은 차수 범위를 따른다.
  const scopedSessions = useMemo(
    () =>
      sessions
        .filter((s) => kind === 'all' || sessionKind(s) === kind)
        .filter((s) => includePast || s.ends_on >= today),
    [sessions, kind, includePast, today],
  )
  const scopedIds = useMemo(() => new Set(scopedSessions.map((s) => s.id)), [scopedSessions])
  const scopedApps = useMemo(
    () => applications.filter((a) => a.session_id != null && scopedIds.has(a.session_id)),
    [applications, scopedIds],
  )

  // ── 처리 대기(전체 기준 — 필터와 무관하게 놓치면 안 되는 일) ──
  const todo = [
    { label: '입금확인 대기', hint: '입금완료 신고 · 통장 대조', count: applications.filter((a) => a.needs_review).length, href: '/admin/applications' },
    { label: '추가입금 신고', hint: '수정 증액분 입금 신고', count: applications.filter((a) => a.due_amount > 0 && a.due_claimed_at).length, href: '/admin/applications' },
    { label: '예비(대기) 신청', hint: '정원 초과 · 편입/거절 결정', count: applications.filter((a) => a.is_waitlisted && ACTIVE.has(a.status)).length, href: '/admin/applications' },
    { label: '수정요청', hint: '처리대기', count: modifications.filter((m) => m.status === 'pending').length, href: '/admin/applications' },
    { label: '환불요청', hint: '신청대기 · 신청확인', count: refunds.filter((r) => r.status === 'requested' || r.status === 'confirmed').length, href: '/admin/applications' },
    { label: '미답변 문의', hint: '1:1 문의', count: inquiries.filter((q) => q.status === 'open').length, href: '/admin/inquiries' },
  ]

  // ── 핵심 지표(차수 범위 기준) ──
  const active = scopedApps.filter((a) => ACTIVE.has(a.status))
  const capacity = scopedSessions.reduce((n, s) => n + s.capacity, 0)
  const occupied = scopedSessions.reduce((n, s) => n + s.occupied, 0)
  const kpis = [
    { label: '유효 신청', value: `${active.length}건`, sub: `취소·환불 ${scopedApps.length - active.length}건 제외` },
    { label: '참가 인원', value: `${active.reduce((n, a) => n + a.headcount, 0)}명`, sub: `예비 ${scopedSessions.reduce((n, s) => n + s.waitlisted, 0)}명 별도` },
    { label: '정원 충원율', value: capacity ? `${Math.round((occupied / capacity) * 100)}%` : '—', sub: `${occupied} / ${capacity}명` },
    { label: '입금확정 매출', value: formatKRW(scopedApps.reduce((n, a) => n + netDeposit(a), 0)), sub: '환불·미수 추가입금 차감' },
    { label: '미입금', value: formatKRW(scopedApps.reduce((n, a) => n + unpaid(a), 0)), sub: `입금대기 ${scopedApps.filter((a) => a.status === 'pending').length}건 + 추가입금` },
    { label: '참가자 정보 미입력', value: `${scopedApps.reduce((n, a) => n + missingInfo(a), 0)}명`, sub: '자율패키지 동반 참가자' },
  ]

  // ── 차수별 현황 ──
  const rows = scopedSessions.map((s) => {
    const apps = applications.filter((a) => a.session_id === s.id)
    const act = apps.filter((a) => ACTIVE.has(a.status))
    const rental = act.reduce(
      (t, a) => {
        const c = rentalCounts(a)
        return { apparel: t.apparel + c.apparel, goggle: t.goggle + c.goggle, protector: t.protector + c.protector, glove: t.glove + c.glove }
      },
      { apparel: 0, goggle: 0, protector: 0, glove: 0 },
    )
    return {
      s,
      pending: act.filter((a) => a.status === 'pending').length,
      paid: act.filter((a) => a.status === 'paid').length,
      completed: act.filter((a) => a.status === 'completed').length,
      closed: apps.length - act.length,
      heads: act.reduce((n, a) => n + a.headcount, 0),
      deposit: apps.reduce((n, a) => n + netDeposit(a), 0),
      unpaid: apps.reduce((n, a) => n + unpaid(a), 0),
      missing: apps.reduce((n, a) => n + missingInfo(a), 0),
      rental,
    }
  })
  const total = rows.reduce(
    (t, r) => ({
      capacity: t.capacity + r.s.capacity,
      occupied: t.occupied + r.s.occupied,
      waitlisted: t.waitlisted + r.s.waitlisted,
      pending: t.pending + r.pending,
      paid: t.paid + r.paid,
      completed: t.completed + r.completed,
      closed: t.closed + r.closed,
      heads: t.heads + r.heads,
      deposit: t.deposit + r.deposit,
      unpaid: t.unpaid + r.unpaid,
      missing: t.missing + r.missing,
    }),
    { capacity: 0, occupied: 0, waitlisted: 0, pending: 0, paid: 0, completed: 0, closed: 0, heads: 0, deposit: 0, unpaid: 0, missing: 0 },
  )

  // ── 최근 14일 신청 추이(차수 범위 기준, KST 일자) ──
  const days = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(Date.parse(today) - (13 - i) * 86_400_000)
    return d.toISOString().slice(0, 10)
  })
  const daily = days.map((d) => ({ day: d, count: scopedApps.filter((a) => kstDate(a.created_at) === d).length }))
  const dailyMax = Math.max(1, ...daily.map((d) => d.count))

  // ── 참가자 구성(유효 신청의 참가자) ──
  const parts = active.flatMap((a) => a.participants)
  const tally = (keys: string[]) => {
    const m = new Map<string, number>()
    for (const k of keys) m.set(k, (m.get(k) ?? 0) + 1)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  }
  const sportOf = (p: ApplicationAdmin['participants'][number]) => {
    const lv = p.lesson_level ?? ''
    const eq = typeof p.rentals.equipment === 'string' ? p.rentals.equipment : ''
    const k = lv.startsWith('board') || eq === 'board' ? 'board' : lv.startsWith('ski') || eq === 'ski' ? 'ski' : ''
    return k === 'ski' ? '스키' : k === 'board' ? '스노보드' : '미입력'
  }
  const breakdowns = [
    { title: '성별', data: tally(parts.map((p) => (p.gender === 'male' ? '남' : p.gender === 'female' ? '여' : '미입력'))) },
    { title: '종목', data: tally(parts.map(sportOf)) },
    { title: '강습 수준', data: tally(parts.map((p) => (p.lesson_level ? lessonLevelLabel(p.lesson_level) : '미입력'))) },
    { title: '알게 된 경로', data: tally(active.flatMap((a) => (a.referral_source.length ? a.referral_source : ['미응답']))), unit: '건' },
  ]

  return (
    <div className="space-y-6">
      {/* 처리 대기 — 전체 기준 */}
      <section>
        <SectionTitle title="처리 대기" note="전체 신청 기준 · 클릭하면 해당 관리 화면으로 이동" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {todo.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className={`${CARD} group flex flex-col px-4 py-3.5 transition-colors hover:bg-[#f7f9fb]`}
            >
              <span className="flex items-center justify-between text-[12px] font-[500] text-[#4b5563]">
                {t.label}
                <ArrowRight size={13} className="text-[#c0c6cd] transition-colors group-hover:text-[#1e3a5f]" />
              </span>
              <span className={`mt-1.5 text-[24px] font-[600] tabular-nums ${t.count > 0 ? 'text-[#b4483a]' : 'text-[#c0c6cd]'}`}>
                {t.count}
              </span>
              <span className="mt-0.5 text-[11px] font-[300] text-[#9ca3af]">{t.hint}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* 필터 — 이하 섹션 공통(유형 · 지난 차수 포함) */}
      <div className="flex flex-wrap items-center gap-3">
        <AdminTabs<KindFilter>
          tabs={[
            { key: 'all', label: '전체' },
            { key: 'jikmu', label: '직무연수' },
            { key: 'jayul', label: '자율패키지' },
          ]}
          value={kind}
          onChange={setKind}
          className="rounded-[8px]"
        />
        <label className="flex cursor-pointer items-center gap-1.5 text-[12.5px] text-[#4b5563]">
          <input type="checkbox" checked={includePast} onChange={(e) => setIncludePast(e.target.checked)} className="h-4 w-4 accent-[#1e3a5f]" />
          지난 차수 포함
        </label>
        <span className="text-[11.5px] font-[300] text-[#9ca3af]">대상 차수 {scopedSessions.length}개</span>
      </div>

      {/* 핵심 지표 */}
      <section className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <div key={k.label} className={`${CARD} px-4 py-3.5`}>
            <p className="text-[12px] font-[500] text-[#6b7280]">{k.label}</p>
            <p className="mt-1.5 text-[20px] font-[600] tabular-nums text-[#1f2937]">{k.value}</p>
            <p className="mt-0.5 text-[11px] font-[300] text-[#9ca3af]">{k.sub}</p>
          </div>
        ))}
      </section>

      {/* 차수별 현황 */}
      <section>
        <SectionTitle title="차수별 현황" note="정원 = 입금대기·입금확인·연수완료 인원(예비 제외) · 금액 기준은 정산 관리와 동일" />
        <div className={`${CARD} overflow-x-auto`}>
          <table className="w-full min-w-[1180px] text-left">
            <thead>
              <tr className="border-b border-[#eceef1] bg-[#fafbfc] text-[11.5px] font-[500] text-[#9ca3af]">
                <th className="px-4 py-2.5">차수</th>
                <th className="px-3 py-2.5">기간</th>
                <th className="px-3 py-2.5">정원</th>
                <th className="px-3 py-2.5 text-right">예비</th>
                <th className="px-3 py-2.5 text-right">입금대기</th>
                <th className="px-3 py-2.5 text-right">입금확인</th>
                <th className="px-3 py-2.5 text-right">연수완료</th>
                <th className="px-3 py-2.5 text-right">취소·환불</th>
                <th className="px-3 py-2.5 text-right">입금확정액</th>
                <th className="px-3 py-2.5 text-right">미입금</th>
                <th className="px-3 py-2.5">렌탈(의류·고글·보호대·장갑)</th>
                <th className="px-4 py-2.5 text-right">정보 미입력</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-16 text-center text-[13px] font-[300] text-[#9ca3af]">
                    해당 조건의 차수가 없습니다.
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const past = r.s.ends_on < today
                  return (
                    <tr key={r.s.id} className={`border-b border-[#f4f5f7] text-[12.5px] text-[#374151] last:border-0 ${past ? 'opacity-55' : ''}`}>
                      <td className="px-4 py-2.5">
                        <span className="block text-[11px] text-[#9ca3af]">{SCHEDULE_TYPE[r.s.schedule_type].label}{!r.s.is_active && ' · 비활성'}</span>
                        <span className="font-[500]">{r.s.label}</span>
                      </td>
                      <td className="px-3 py-2.5 tabular-nums text-[#6b7280]">
                        {formatPeriod(r.s.starts_on, r.s.ends_on, r.s.nights)}
                        <span className="ml-1.5 text-[11px] text-[#9ca3af]">{dDay(r.s.starts_on, today)}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        <FillMeter occupied={r.s.occupied} capacity={r.s.capacity} />
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.s.waitlisted || '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.pending || '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.paid || '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.completed || '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums text-[#9ca3af]">{r.closed || '—'}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.deposit ? formatKRW(r.deposit) : '—'}</td>
                      <td className={`px-3 py-2.5 text-right tabular-nums ${r.unpaid ? 'text-[#8a4b00]' : ''}`}>{r.unpaid ? formatKRW(r.unpaid) : '—'}</td>
                      <td className="px-3 py-2.5 tabular-nums text-[#6b7280]">
                        {r.rental.apparel} · {r.rental.goggle} · {r.rental.protector} · {r.rental.glove}
                      </td>
                      <td className={`px-4 py-2.5 text-right tabular-nums ${r.missing ? 'text-[#b4483a]' : ''}`}>{r.missing || '—'}</td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[#e5e7eb] bg-[#f7f8f9] text-[12.5px] font-[600] text-[#1f2937]">
                  <td className="px-4 py-3" colSpan={2}>합계 · {rows.length}개 차수 · {total.heads}명</td>
                  <td className="px-3 py-3 tabular-nums">{total.occupied} / {total.capacity}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{total.waitlisted}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{total.pending}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{total.paid}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{total.completed}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{total.closed}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatKRW(total.deposit)}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{formatKRW(total.unpaid)}</td>
                  <td className="px-3 py-3" />
                  <td className="px-4 py-3 text-right tabular-nums">{total.missing}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[1.1fr_1fr]">
        {/* 신청 추이 — 단일 계열 막대 */}
        <section>
          <SectionTitle title="최근 14일 신청" note={`신청일(KST) 기준 · 합계 ${daily.reduce((n, d) => n + d.count, 0)}건`} />
          <div className={`${CARD} px-5 pb-4 pt-5`}>
            <div className="flex h-[150px] items-end gap-[2px] border-b border-[#e5e7eb]">
              {daily.map((d) => (
                <div key={d.day} className="group relative flex h-full flex-1 items-end justify-center" title={`${d.day.slice(5).replace('-', '/')} · ${d.count}건`}>
                  {d.count > 0 && (
                    <span className="absolute text-[10.5px] tabular-nums text-[#6b7280]" style={{ bottom: `calc(${(d.count / dailyMax) * 100}% + 3px)` }}>
                      {d.count}
                    </span>
                  )}
                  <div
                    className="w-full max-w-[22px] rounded-t-[4px] transition-opacity group-hover:opacity-80"
                    style={{ height: `${(d.count / dailyMax) * 100}%`, minHeight: d.count ? 2 : 0, background: NAVY }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-1.5 flex gap-[2px]">
              {daily.map((d, i) => (
                <span key={d.day} className="flex-1 text-center text-[10px] tabular-nums text-[#9ca3af]">
                  {i % 2 === 1 || i === 13 ? d.day.slice(8) : ''}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* 참가자 구성 */}
        <section>
          <SectionTitle title="참가자 구성" note="유효 신청 기준(입금대기·입금확인·연수완료)" />
          <div className={`${CARD} grid grid-cols-2 gap-x-6 gap-y-5 px-5 py-4`}>
            {breakdowns.map((b) => (
              <Breakdown key={b.title} title={b.title} data={b.data} unit={b.unit ?? '명'} />
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}

function SectionTitle({ title, note }: { title: string; note?: string }) {
  return (
    <div className="mb-2.5 flex flex-wrap items-baseline gap-x-2">
      <h2 className="text-[15px] font-[600] text-[#1f2937]">{title}</h2>
      {note && <span className="text-[11.5px] font-[300] text-[#9ca3af]">{note}</span>}
    </div>
  )
}

// 정원 충원 미터 — 단일 색(네이비), 마감(100%↑)은 텍스트 라벨로 함께 표기(색 단독 의존 금지).
function FillMeter({ occupied, capacity }: { occupied: number; capacity: number }) {
  const pct = capacity ? Math.min(100, Math.round((occupied / capacity) * 100)) : 0
  const full = capacity > 0 && occupied >= capacity
  return (
    <div className="flex items-center gap-2" title={`${occupied} / ${capacity}명 (${pct}%)`}>
      <div className="h-[6px] w-[72px] overflow-hidden rounded-full bg-[#eef1f4]">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: full ? '#b4483a' : NAVY }} />
      </div>
      <span className="whitespace-nowrap tabular-nums text-[12px]">
        {occupied}/{capacity}
        {full && <span className="ml-1 text-[11px] font-[500] text-[#b4483a]">마감</span>}
      </span>
    </div>
  )
}

// 구성 분포 — 가로 막대(단일 색) + 값 라벨. 상위 5개, 나머지는 '기타'로 접음.
function Breakdown({ title, data, unit }: { title: string; data: [string, number][]; unit: string }) {
  const top = data.slice(0, 5)
  const rest = data.slice(5).reduce((n, [, v]) => n + v, 0)
  const items: [string, number][] = rest ? [...top, ['기타', rest]] : top
  const max = Math.max(1, ...items.map(([, v]) => v))
  return (
    <div>
      <p className="mb-2 text-[12px] font-[500] text-[#4b5563]">{title}</p>
      {items.length === 0 ? (
        <p className="text-[11.5px] font-[300] text-[#9ca3af]">데이터 없음</p>
      ) : (
        <div className="space-y-1.5">
          {items.map(([k, v]) => (
            <div key={k} className="grid grid-cols-[84px_1fr_auto] items-center gap-2" title={`${k} · ${v}${unit}`}>
              <span className="truncate text-[11.5px] text-[#6b7280]">{k}</span>
              <div className="h-[6px] overflow-hidden rounded-full bg-[#eef1f4]">
                <div className="h-full rounded-full" style={{ width: `${(v / max) * 100}%`, background: NAVY }} />
              </div>
              <span className="text-right text-[11.5px] tabular-nums text-[#374151]">{v}{unit}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
