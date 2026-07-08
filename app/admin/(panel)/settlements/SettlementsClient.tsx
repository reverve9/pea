'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { Download } from 'lucide-react'
import AdminToolbar, { adminSelectClass } from '@/components/admin/AdminToolbar'
import AdminDateField from '@/components/admin/AdminDateField'
import { InlinePagination } from '@/components/admin/AdminList'
import { Badge } from '@/components/common/Badge'
import { formatKRW, formatDate, APPLICATION_STATUS } from '@/lib/display'
import {
  aggregateByPeriod,
  aggregateBySession,
  aggregateByKind,
  calcTotals,
  filterByPeriod,
  SETTLEMENT_MODE_LABEL,
  KIND_SHORT,
  type SettlementDatum,
  type SettlementRow,
  type SettlementMode,
} from '@/lib/settlement'
import { exportToExcelMultiSheet, type ExcelColumn } from '@/lib/excel'

// 뷰 = 요약(집계) vs 명세(건별) — 밀도. 축 = 어떻게 자르나(양쪽 뷰에 적용, 같은 한 층).
// 기간별은 일 단위 고정 — 일/월 서브토글(숨은 반쪽 계층)은 두지 않는다.
type SettlementView = 'summary' | 'detail'
type SortAxis = 'period' | 'session' | 'kind'

// 건별 명세 열 — 집계표와 구조가 달라 별도 정의.
const DETAIL_COLUMNS: (ExcelColumn & { align?: 'left' | 'right' })[] = [
  { key: 'basis', label: '입금확인일', align: 'left' },
  { key: 'no', label: '신청번호', align: 'left' },
  { key: 'applicant', label: '신청자', align: 'left' },
  { key: 'payer', label: '입금자명', align: 'left' },
  { key: 'kind', label: '유형', align: 'left' },
  { key: 'session', label: '차수', align: 'left' },
  { key: 'gross', label: '결제액', align: 'right' },
  { key: 'refund', label: '환불액', align: 'right' },
  { key: 'net', label: '순액', align: 'right' },
  { key: 'status', label: '상태', align: 'left' },
]

// 표·엑셀 공용 열 정의 — SettlementRow 키 그대로.
const COLUMNS: (ExcelColumn & { align?: 'left' | 'right'; money?: boolean; strong?: boolean })[] = [
  { key: 'label', label: '구분', align: 'left' },
  { key: 'depositCount', label: '입금건수', align: 'right' },
  { key: 'grossSales', label: '입금확정매출', align: 'right', money: true },
  { key: 'refundCount', label: '환불건수', align: 'right' },
  { key: 'refundAmount', label: '환불액', align: 'right', money: true },
  { key: 'netSettle', label: '순정산', align: 'right', money: true, strong: true },
]

function cellText(row: SettlementRow, key: string, money?: boolean): string {
  const v = row[key as keyof SettlementRow]
  if (typeof v === 'number') return money ? formatKRW(v) : v.toLocaleString()
  return String(v ?? '')
}

export default function SettlementsClient({ data }: { data: SettlementDatum[] }) {
  const [view, setView] = useState<SettlementView>('summary')
  const [axis, setAxis] = useState<SortAxis>('period')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  // 결제방식 가정 = 무통장입금 고정(수수료 0). 가상계좌 토글은 결제수단 확정 시 복원(수수료 상수라 추가 용이).
  const mode: SettlementMode = 'mudong'

  const filtered = useMemo(() => filterByPeriod(data, from || undefined, to || undefined), [data, from, to])

  const rows = useMemo(() => {
    if (axis === 'period') return aggregateByPeriod(filtered, 'day', mode)
    if (axis === 'session') return aggregateBySession(filtered, mode)
    return aggregateByKind(filtered, mode)
  }, [filtered, axis, mode])

  const totals = useMemo(() => calcTotals(rows, mode), [rows, mode])

  // 건별 명세 — 선택된 축(기간/차수/유형)으로 정렬. 같은 그룹 내에서는 입금확인일 오름차순.
  // 순액 = 결제액 − 환불액(수수료는 건별 대사엔 미포함).
  const detailData = useMemo(() => {
    const byDate = (a: SettlementDatum, b: SettlementDatum) => a.basisISO.localeCompare(b.basisISO)
    const arr = [...filtered]
    if (axis === 'session') {
      arr.sort((a, b) => a.sessionLabel.localeCompare(b.sessionLabel) || byDate(a, b))
    } else if (axis === 'kind') {
      arr.sort((a, b) => (a.kind === b.kind ? byDate(a, b) : a.kind === 'jikmu' ? -1 : 1))
    } else {
      arr.sort(byDate)
    }
    return arr
  }, [filtered, axis])
  const detailTotals = useMemo(() => {
    const gross = detailData.reduce((s, d) => s + d.grossAmount, 0)
    const refund = detailData.reduce((s, d) => s + d.refundAmount, 0)
    return { gross, refund, net: gross - refund }
  }, [detailData])

  // 페이지네이션(공용 InlinePagination) — 현재 뷰의 표시 목록(집계 rows / 건별 detailData)을 20개씩.
  const PAGE = 20
  const [page, setPage] = useState(1)
  useEffect(() => setPage(1), [view, axis, from, to])
  const listLen = view === 'detail' ? detailData.length : rows.length
  const totalPages = Math.max(1, Math.ceil(listLen / PAGE))
  const safePage = Math.min(page, totalPages)
  const start = (safePage - 1) * PAGE
  const pagedRows = rows.slice(start, start + PAGE)
  const pagedDetail = detailData.slice(start, start + PAGE)

  // 축(어떻게 자르나) · 밀도(집계 vs 건별) — 신청관리식 드롭다운 필터. 축은 양쪽 뷰에 적용.
  const AXIS_OPTIONS: { value: SortAxis; label: string }[] = [
    { value: 'period', label: '기간별' },
    { value: 'session', label: '차수별' },
    { value: 'kind', label: '유형별' },
  ]
  const VIEW_OPTIONS: { value: SettlementView; label: string }[] = [
    { value: 'summary', label: '집계' },
    { value: 'detail', label: '건별명세' },
  ]

  const exportExcel = async () => {
    const excelCols: ExcelColumn[] = COLUMNS.map((c) => ({ key: c.key, label: c.label }))
    const withTotal = (rs: SettlementRow[]): Record<string, unknown>[] =>
      [...rs, { ...calcTotals(rs, mode), label: '합계' }] as unknown as Record<string, unknown>[]
    const period = aggregateByPeriod(filtered, 'day', mode)
    const session = aggregateBySession(filtered, mode)
    const kind = aggregateByKind(filtered, mode)
    const detailRows: Record<string, unknown>[] = detailData.map((d) => ({
      basis: formatDate(d.basisISO),
      no: d.applicationNo,
      applicant: d.applicantName,
      payer: d.payerName ?? d.applicantName,
      kind: KIND_SHORT[d.kind],
      session: d.sessionLabel,
      gross: d.grossAmount,
      refund: d.refundAmount,
      net: d.grossAmount - d.refundAmount,
      status: APPLICATION_STATUS[d.status].label,
    }))
    detailRows.push({
      basis: '합계',
      no: '',
      applicant: '',
      payer: '',
      kind: '',
      session: '',
      gross: detailTotals.gross,
      refund: detailTotals.refund,
      net: detailTotals.net,
      status: '',
    })
    const range = from || to ? `${from || '처음'}~${to || '끝'}` : '전체'
    await exportToExcelMultiSheet(
      [
        { name: '기간별', rows: withTotal(period), columns: excelCols },
        { name: '차수별', rows: withTotal(session), columns: excelCols },
        { name: '유형별', rows: withTotal(kind), columns: excelCols },
        { name: '건별명세', rows: detailRows, columns: DETAIL_COLUMNS.map((c) => ({ key: c.key, label: c.label })) },
      ],
      `정산_${SETTLEMENT_MODE_LABEL[mode]}_${range}`,
    )
  }

  return (
    <div>
      {/* 필터/정렬 바 — 신청관리 정본 툴바(틴트 박스 + 흰채움 컨트롤)와 통일. 좌=필터, 우=엑셀. */}
      <AdminToolbar
        className="mb-4"
        right={
          <>
            <button
              type="button"
              onClick={exportExcel}
              disabled={listLen === 0}
              className="flex items-center gap-1.5 rounded-[8px] bg-[#1e6b4f] px-3 py-1.5 text-[12px] font-[500] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
            >
              <Download size={13} />
              엑셀 내보내기
            </button>
            <p className="whitespace-nowrap text-[12px] font-[300] text-[#6b7280]">
              전체 <span className="font-[600] tabular-nums text-[#1f2937]">{listLen}</span>건
            </p>
            <InlinePagination page={safePage} totalPages={totalPages} onChange={setPage} />
          </>
        }
      >
        {/* 한 줄 드롭다운 필터 — 신청관리와 동일. 기간(YYMMDD) · 축 · 집계/건별. 축은 양쪽 뷰에 적용. */}
        <div className="flex flex-wrap items-center gap-x-2 gap-y-2">
          <span className="text-[11.5px] font-[400] text-[#8a93a0]">입금확인일</span>
          <AdminDateField value={from} onChange={setFrom} />
          <span className="text-[#b0b6be]">~</span>
          <AdminDateField value={to} onChange={setTo} />
          {(from || to) && (
            <button
              type="button"
              onClick={() => {
                setFrom('')
                setTo('')
              }}
              className="rounded-[6px] px-2 py-1 text-[11.5px] font-[400] text-[#8a93a0] hover:bg-white"
            >
              전체
            </button>
          )}
          <select
            className={adminSelectClass}
            value={axis}
            onChange={(e) => setAxis(e.target.value as SortAxis)}
            aria-label="집계 기준"
          >
            {AXIS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            className={adminSelectClass}
            value={view}
            onChange={(e) => setView(e.target.value as SettlementView)}
            aria-label="집계/건별"
          >
            {VIEW_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>
      </AdminToolbar>

      {/* 정산표 — 테두리 없이 흰 카드 + 은은한 그림자 */}
      <div className="overflow-x-auto rounded-[12px] bg-white shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
        {view === 'detail' ? (
          /* 건별 명세 — 누가·어떤 건·얼마 입금/환불 (대사·검증용) */
          <table className="w-full min-w-[860px] text-left">
            <thead>
              <tr className="border-b border-[#eceef1] bg-[#fafbfc] text-[11.5px] font-[500] text-[#9ca3af]">
                {DETAIL_COLUMNS.map((c) => (
                  <th key={c.key} className={`px-4 py-2.5 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {detailData.length === 0 ? (
                <tr>
                  <td colSpan={DETAIL_COLUMNS.length} className="px-4 py-16 text-center text-[13px] font-[300] text-[#9ca3af]">
                    입금확정 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                pagedDetail.map((d) => {
                  const payerMismatch = d.payerName != null && d.payerName.trim() !== d.applicantName.trim()
                  return (
                    <tr key={d.id} className="border-b border-[#f4f5f7] text-[12.5px] text-[#374151] last:border-0">
                      <td className="px-4 py-2.5">{formatDate(d.basisISO)}</td>
                      <td className="px-4 py-2.5 tabular-nums text-[#6b7280]">{d.applicationNo}</td>
                      <td className="px-4 py-2.5 font-[500]">{d.applicantName}</td>
                      <td className={`px-4 py-2.5 ${payerMismatch ? 'text-[#c0392b]' : 'text-[#6b7280]'}`}>
                        {d.payerName ?? d.applicantName}
                      </td>
                      <td className="px-4 py-2.5">{KIND_SHORT[d.kind]}</td>
                      <td className="px-4 py-2.5 text-[#6b7280]">{d.sessionLabel}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums">{formatKRW(d.grossAmount)}</td>
                      <td className="px-4 py-2.5 text-right tabular-nums text-[#8f3a2a]">
                        {d.refundAmount > 0 ? formatKRW(d.refundAmount) : '—'}
                      </td>
                      <td className="px-4 py-2.5 text-right font-[600] tabular-nums text-[#1f2937]">
                        {formatKRW(d.grossAmount - d.refundAmount)}
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge color={APPLICATION_STATUS[d.status].color} size="sm">
                          {APPLICATION_STATUS[d.status].label}
                        </Badge>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {detailData.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[#e5e7eb] bg-[#f7f8f9] text-[12.5px] font-[600] text-[#1f2937]">
                  <td className="px-4 py-3" colSpan={6}>합계 · {detailData.length}건</td>
                  <td className="px-4 py-3 text-right tabular-nums">{formatKRW(detailTotals.gross)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#8f3a2a]">{formatKRW(detailTotals.refund)}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-[#1e6b4f]">{formatKRW(detailTotals.net)}</td>
                  <td className="px-4 py-3" />
                </tr>
              </tfoot>
            )}
          </table>
        ) : (
          <table className="w-full min-w-[720px] text-left">
            <thead>
              <tr className="border-b border-[#eceef1] bg-[#fafbfc] text-[11.5px] font-[500] text-[#9ca3af]">
                {COLUMNS.map((c) => (
                  <th key={c.key} className={`px-4 py-2.5 ${c.align === 'right' ? 'text-right' : 'text-left'}`}>
                    {c.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length} className="px-4 py-16 text-center text-[13px] font-[300] text-[#9ca3af]">
                    집계할 입금확정 내역이 없습니다.
                  </td>
                </tr>
              ) : (
                pagedRows.map((r) => (
                  <tr key={r.groupKey} className="border-b border-[#f4f5f7] text-[12.5px] text-[#374151] last:border-0">
                    {COLUMNS.map((c) => (
                      <td
                        key={c.key}
                        className={`px-4 py-2.5 ${c.align === 'right' ? 'text-right tabular-nums' : 'text-left'} ${
                          c.strong ? 'font-[600] text-[#1f2937]' : ''
                        }`}
                      >
                        {cellText(r, c.key, c.money)}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[#e5e7eb] bg-[#f7f8f9] text-[12.5px] font-[600] text-[#1f2937]">
                  {COLUMNS.map((c) => (
                    <td
                      key={c.key}
                      className={`px-4 py-3 ${c.align === 'right' ? 'text-right tabular-nums' : 'text-left'} ${
                        c.key === 'netSettle' ? 'text-[#1e6b4f]' : ''
                      }`}
                    >
                      {c.key === 'label' ? '합계' : cellText(totals, c.key, c.money)}
                    </td>
                  ))}
                </tr>
              </tfoot>
            )}
          </table>
        )}
      </div>

      <p className="mt-3 text-[11.5px] font-[300] leading-[1.7] text-[#9ca3af]">
        {view === 'detail' ? (
          <>
            · 건별 명세 = 입금확정 건의 실입금 대사용. 선택한 축(기간·차수·유형)으로 정렬됩니다. 순액 = 결제액 − 환불액.
            <br />· 입금자명이 신청자와 다르면 <span className="text-[#c0392b]">빨간색</span>으로 표시됩니다. 미입력 시 신청자를 입금자로 간주합니다.
          </>
        ) : (
          <>
            · 정산 대상 = 입금확정(입금확인·연수완료·환불) 건, 기준일 = 입금확인일.
            <br />· 순정산 = 입금확정매출 − 환불액. 환불액은 관리자가 설정한 확정액입니다.
          </>
        )}
      </p>
    </div>
  )
}
