// 엑셀 export 공용 유틸 — xlsx(SheetJS) 래퍼. dynamic import 로 번들 분리(~420KB).
// 정산관리처럼 '기간별/차수별/유형별' 여러 시트를 한 워크북으로 묶어 내보낸다.

const loadXLSX = () => import('xlsx')

export interface ExcelColumn {
  key: string
  label: string
}
export interface ExcelSheet {
  name: string
  rows: Record<string, unknown>[]
  columns: ExcelColumn[]
}

// 데이터 셀(헤더 제외)의 숫자에 천단위 구분 포맷 적용.
function applyThousandsFormat(ws: Record<string, unknown>, XLSX: typeof import('xlsx')): void {
  const ref = ws['!ref'] as string | undefined
  if (!ref) return
  const range = XLSX.utils.decode_range(ref)
  for (let R = range.s.r + 1; R <= range.e.r; R++) {
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: R, c: C })
      const cell = ws[addr] as { t?: string; z?: string } | undefined
      if (cell && cell.t === 'n') cell.z = '#,##0'
    }
  }
}

function buildSheet(sheet: ExcelSheet, XLSX: typeof import('xlsx')) {
  const header = sheet.columns.map((c) => c.label)
  const data = sheet.rows.map((row) =>
    sheet.columns.map((c) => {
      const v = row[c.key]
      if (v === null || v === undefined) return ''
      return v
    }),
  )
  const ws = XLSX.utils.aoa_to_sheet([header, ...data])
  applyThousandsFormat(ws as unknown as Record<string, unknown>, XLSX)
  ws['!cols'] = sheet.columns.map((c, idx) => {
    const maxLen = Math.max(
      c.label.length,
      ...data.map((row) => {
        const cell = row[idx]
        if (typeof cell === 'number') return cell.toLocaleString().length
        return String(cell ?? '').length
      }),
    )
    return { wch: Math.min(Math.max(maxLen + 2, 8), 40) }
  })
  return ws
}

// 단일 시트 .xlsx 다운로드.
export async function exportToExcel(
  rows: Record<string, unknown>[],
  columns: ExcelColumn[],
  fileName: string,
): Promise<void> {
  const XLSX = await loadXLSX()
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, buildSheet({ name: 'Sheet1', rows, columns }, XLSX), 'Sheet1')
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}

// 여러 시트를 한 .xlsx 로 다운로드.
export async function exportToExcelMultiSheet(sheets: ExcelSheet[], fileName: string): Promise<void> {
  const XLSX = await loadXLSX()
  const wb = XLSX.utils.book_new()
  for (const sheet of sheets) {
    const ws = buildSheet(sheet, XLSX)
    const safeName = sheet.name.replace(/[\\/:*?[\]]/g, '_').slice(0, 31)
    XLSX.utils.book_append_sheet(wb, ws, safeName)
  }
  XLSX.writeFile(wb, `${fileName}.xlsx`)
}
