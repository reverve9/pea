// 엑셀 export 공용 유틸 — exceljs 래퍼. dynamic import 로 번들 분리(내보내기 클릭 시에만 로드).
// 정산관리처럼 '기간별/차수별/유형별' 여러 시트를 한 워크북으로 묶어 내보낸다.
//
// 서식 정본(2026-08-05): 헤더 = 네이비 배경 + 흰 굵은글씨 + 가운데정렬 + 틀고정,
//   본문 = 연회색 테두리, 숫자 = 천단위·우측정렬, 컬럼 너비 = 내용 기반 자동, 자동필터.
//   (이전 xlsx(SheetJS) 커뮤니티 빌드는 셀 서식 쓰기가 Pro 전용이라 색·테두리·틀고정이 불가능했다.)

const loadExcelJS = () => import('exceljs')

const NAVY = 'FF1E3A5F' // 헤더 배경 — 어드민 정본 네이비(#1e3a5f)
const BORDER = 'FFE5EAEF' // 본문 테두리 — 카드 테두리와 동일 톤(#e5eaef)
const ZEBRA = 'FFF3F6F9' // 그룹 교차 배경 — 어드민 회색 서피스(#f3f6f9)
const HEADER_H = 24
const ROW_H = 19

export interface ExcelColumn {
  key: string
  label: string
}
export interface ExcelSheet {
  name: string
  rows: Record<string, unknown>[]
  columns: ExcelColumn[]
  // 같은 그룹(예: 같은 신청)끼리 묶어 배경색을 번갈아 칠할 때 쓰는 행 필드명.
  // 그룹 경계가 눈으로 보여 '몇 명짜리 신청인지' 세지 않아도 된다.
  groupBy?: string
}

type Worksheet = import('exceljs').Worksheet

// 내용 길이 기반 컬럼 너비(한글은 폭이 넓어 1.6배로 환산). 최소 8 ~ 최대 40.
function columnWidth(label: string, values: unknown[]): number {
  const width = (s: string) => [...s].reduce((n, ch) => n + (ch.charCodeAt(0) > 0x2e80 ? 1.6 : 1), 0)
  const max = values.reduce<number>((m, v) => {
    const s = typeof v === 'number' ? v.toLocaleString() : String(v ?? '')
    return Math.max(m, width(s))
  }, width(label))
  return Math.min(Math.max(max + 2, 8), 40)
}

function buildSheet(ws: Worksheet, sheet: ExcelSheet): void {
  ws.columns = sheet.columns.map((c) => ({
    key: c.key,
    header: c.label,
    width: columnWidth(
      c.label,
      sheet.rows.map((r) => r[c.key]),
    ),
  }))

  for (const row of sheet.rows) {
    // null/undefined 는 빈칸으로(엑셀에 'undefined' 문자열이 찍히지 않게).
    const values: Record<string, unknown> = {}
    for (const c of sheet.columns) values[c.key] = row[c.key] ?? ''
    ws.addRow(values)
  }

  const header = ws.getRow(1)
  header.height = HEADER_H
  header.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11 }
  header.alignment = { vertical: 'middle', horizontal: 'center' }
  header.eachCell((cell) => {
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: NAVY } }
  })

  // 그룹(신청)별 교차 배경 — 같은 그룹은 같은 색, 그룹이 바뀔 때만 색을 뒤집는다.
  const shaded = new Set<number>()
  if (sheet.groupBy) {
    let prev: unknown
    let on = false
    sheet.rows.forEach((row, i) => {
      const key = row[sheet.groupBy!]
      if (i === 0 || key !== prev) on = i === 0 ? false : !on
      prev = key
      if (on) shaded.add(i + 2) // +2 = 헤더(1행) 다음부터
    })
  }

  const edge = { style: 'thin' as const, color: { argb: BORDER } }
  ws.eachRow((row, rowNumber) => {
    if (rowNumber > 1) row.height = ROW_H
    row.eachCell((cell) => {
      cell.border = { top: edge, left: edge, bottom: edge, right: edge }
      if (rowNumber === 1) return
      if (shaded.has(rowNumber)) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } }
      }
      if (typeof cell.value === 'number') {
        cell.numFmt = '#,##0'
        cell.alignment = { vertical: 'middle', horizontal: 'right' }
      } else {
        cell.alignment = { vertical: 'middle' }
      }
    })
  })

  // 헤더 고정 + 자동필터 — 컬럼이 많은 시트에서 어느 열인지 놓치지 않게.
  ws.views = [{ state: 'frozen', ySplit: 1 }]
  if (sheet.rows.length > 0) {
    ws.autoFilter = { from: { row: 1, column: 1 }, to: { row: 1, column: sheet.columns.length } }
  }
}

// 브라우저 다운로드 — exceljs 는 파일 저장을 하지 않으므로 Blob + a[download] 로 내린다.
async function download(wb: import('exceljs').Workbook, fileName: string): Promise<void> {
  const buffer = await wb.xlsx.writeBuffer()
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${fileName}.xlsx`
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

// 시트명 제약 — 31자 이하 + 금지문자(\ / : * ? [ ]) 치환.
const safeSheetName = (name: string) => name.replace(/[\\/:*?[\]]/g, '_').slice(0, 31)

// 단일 시트 .xlsx 다운로드.
export async function exportToExcel(
  rows: Record<string, unknown>[],
  columns: ExcelColumn[],
  fileName: string,
): Promise<void> {
  const ExcelJS = await loadExcelJS()
  const wb = new ExcelJS.Workbook()
  buildSheet(wb.addWorksheet('Sheet1'), { name: 'Sheet1', rows, columns })
  await download(wb, fileName)
}

// 여러 시트를 한 .xlsx 로 다운로드.
export async function exportToExcelMultiSheet(sheets: ExcelSheet[], fileName: string): Promise<void> {
  const ExcelJS = await loadExcelJS()
  const wb = new ExcelJS.Workbook()
  for (const sheet of sheets) buildSheet(wb.addWorksheet(safeSheetName(sheet.name)), sheet)
  await download(wb, fileName)
}
