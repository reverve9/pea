// 정산 집계 엔진 — 순수 함수(서버·클라이언트 공용, supabase 의존 없음).
// 조회는 lib/adminQueries.getSettlementData 가 담당하고, 이 파일은 집계·수식만.
//
// 정책(2026-07-08 오너 확정):
//  - 정산 대상 = 입금확정 = status ∈ {paid, completed, refunded} (한때 실입금된 건)
//  - 집계 기준일 = deposit_confirmed_at(입금확인일). null 이면 created_at 폴백.
//  - 환불 반영 = 관리자 수기 설정 refunded_amount 를 매출에서 차감(부분환불·PG환불 동일).
//  - 결제대행(가상계좌) 수수료 = 건당 PG_FEE_KRW. 결제수단 컬럼이 아직 없어(추후)
//    화면의 '결제방식 가정' 토글로 적용: 무통장=0, 가상계좌=입금건수×PG_FEE_KRW.
//  - 순정산 = 입금확정매출 − 환불액 − PG수수료.

import type { ApplicationStatus } from './types'

// 가상계좌 결제대행 건당 수수료(원). 실값 확정 시 여기 한 곳만 교체.
export const PG_FEE_KRW = 400

// 결제방식 가정 — 결제수단(payment_method) 컬럼 도입 전까지 화면 토글로 수수료 적용 여부 결정.
export type SettlementMode = 'mudong' | 'virtual'
export const SETTLEMENT_MODE_LABEL: Record<SettlementMode, string> = {
  mudong: '무통장입금',
  virtual: '가상계좌',
}

// 집계 단위(기간별 탭 내부).
export type PeriodUnit = 'day' | 'month'

// 정산 원자료 한 건(입금확정 신청 1건) — 서버가 flat 하게 내려주고 클라이언트가 집계·건별명세 모두 렌더.
export interface SettlementDatum {
  id: string
  applicationNo: string // 신청번호
  applicantName: string // 신청자
  payerName: string | null // 입금자명(없으면 신청자 = 입금자로 간주)
  kind: 'jikmu' | 'jayul'
  sessionKey: string // sessions.id
  sessionLabel: string // 회차명
  period: string // 기간 표기(YYYY.MM.DD~)
  status: Extract<ApplicationStatus, 'paid' | 'completed' | 'refunded'>
  basisISO: string // 기준일(deposit_confirmed_at ?? created_at) ISO
  grossAmount: number // total_amount
  refundAmount: number // refunded_amount(환불건만 >0)
}

// 유형 짧은 라벨(건별명세·유형별 공용).
export const KIND_SHORT: Record<SettlementDatum['kind'], string> = { jikmu: '직무', jayul: '자율' }

// 집계 행 — 정산표 + 엑셀 export 의 단일 진실원천.
export interface SettlementRow {
  groupKey: string
  label: string
  depositCount: number // 입금확정 건수(paid+completed+refunded)
  grossSales: number // 입금확정 매출 합
  refundCount: number // 환불 건수
  refundAmount: number // 환불액 합
  pgFee: number // PG 수수료(가정 모드에 따라)
  netSettle: number // 순정산 = grossSales − refundAmount − pgFee
}

// ─── KST 날짜 키 ───────────────────────────────────────────────
const KST_YMD = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Seoul',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})
export function kstDate(iso: string): string {
  return KST_YMD.format(new Date(iso)) // 'YYYY-MM-DD'
}
function kstMonth(iso: string): string {
  return kstDate(iso).slice(0, 7) // 'YYYY-MM'
}

// ─── 수식 단일 진입점 ──────────────────────────────────────────
function computeRow(
  base: Pick<SettlementRow, 'groupKey' | 'label' | 'depositCount' | 'grossSales' | 'refundCount' | 'refundAmount'>,
  mode: SettlementMode,
): SettlementRow {
  const pgFee = mode === 'virtual' ? base.depositCount * PG_FEE_KRW : 0
  const netSettle = base.grossSales - base.refundAmount - pgFee
  return { ...base, pgFee, netSettle }
}

type Bucket = {
  groupKey: string
  label: string
  depositCount: number
  grossSales: number
  refundCount: number
  refundAmount: number
}
function emptyBucket(groupKey: string, label: string): Bucket {
  return { groupKey, label, depositCount: 0, grossSales: 0, refundCount: 0, refundAmount: 0 }
}
function accumulate(b: Bucket, d: SettlementDatum): void {
  b.depositCount += 1
  b.grossSales += d.grossAmount
  if (d.status === 'refunded') {
    b.refundCount += 1
    b.refundAmount += d.refundAmount
  }
}

// ─── 기간 필터(기준일 KST, inclusive) ──────────────────────────
export function filterByPeriod(data: SettlementDatum[], from?: string, to?: string): SettlementDatum[] {
  if (!from && !to) return data
  return data.filter((d) => {
    const day = kstDate(d.basisISO)
    if (from && day < from) return false
    if (to && day > to) return false
    return true
  })
}

// ─── 집계: 기간별 ──────────────────────────────────────────────
export function aggregateByPeriod(data: SettlementDatum[], unit: PeriodUnit, mode: SettlementMode): SettlementRow[] {
  const byKey = new Map<string, Bucket>()
  for (const d of data) {
    const key = unit === 'month' ? kstMonth(d.basisISO) : kstDate(d.basisISO)
    const b = byKey.get(key) ?? emptyBucket(key, key)
    accumulate(b, d)
    byKey.set(key, b)
  }
  return [...byKey.values()]
    .sort((a, b) => (a.groupKey < b.groupKey ? -1 : 1))
    .map((b) => computeRow(b, mode))
}

// ─── 집계: 차수별 ──────────────────────────────────────────────
export function aggregateBySession(data: SettlementDatum[], mode: SettlementMode): SettlementRow[] {
  const byKey = new Map<string, Bucket>()
  for (const d of data) {
    const label = d.period ? `${d.sessionLabel} · ${d.period}` : d.sessionLabel
    const b = byKey.get(d.sessionKey) ?? emptyBucket(d.sessionKey, label)
    accumulate(b, d)
    byKey.set(d.sessionKey, b)
  }
  return [...byKey.values()].sort((a, b) => b.grossSales - a.grossSales).map((b) => computeRow(b, mode))
}

// ─── 집계: 유형별 ──────────────────────────────────────────────
const KIND_LABEL: Record<SettlementDatum['kind'], string> = { jikmu: '직무연수', jayul: '자율연수' }
export function aggregateByKind(data: SettlementDatum[], mode: SettlementMode): SettlementRow[] {
  const byKey = new Map<string, Bucket>()
  for (const d of data) {
    const b = byKey.get(d.kind) ?? emptyBucket(d.kind, KIND_LABEL[d.kind])
    accumulate(b, d)
    byKey.set(d.kind, b)
  }
  // 직무 우선 고정 순서
  const order: SettlementDatum['kind'][] = ['jikmu', 'jayul']
  return order
    .filter((k) => byKey.has(k))
    .map((k) => computeRow(byKey.get(k)!, mode))
}

// ─── 합계 ──────────────────────────────────────────────────────
export function calcTotals(rows: SettlementRow[], mode: SettlementMode, label = '합계'): SettlementRow {
  const sum = (k: keyof SettlementRow) =>
    rows.reduce((s, r) => s + (typeof r[k] === 'number' ? (r[k] as number) : 0), 0)
  return computeRow(
    {
      groupKey: '__total__',
      label,
      depositCount: sum('depositCount'),
      grossSales: sum('grossSales'),
      refundCount: sum('refundCount'),
      refundAmount: sum('refundAmount'),
    },
    mode,
  )
}
