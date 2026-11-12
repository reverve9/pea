'use client'

import { Fragment, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { PAY_CONFIRM, type PayConfirmDoc } from '@/lib/payConfirm'

// 이체확인서 — 양식 PDF(A4, 595×842pt) 배치를 pt 좌표 그대로 옮긴 화면.
// 1단위 = 시트 폭/595 (container query) → 화면 폭에 맞춰 축소되고, 인쇄 시 시트 폭 = 210mm 로 원본 크기.
// 인쇄: 이 포털만 남기고 페이지 나머지를 숨긴다(@media print). 브라우저 인쇄 창에서 'PDF로 저장' 가능.

const u = (n: number) => `calc(var(--pc-u) * ${n})`
const LINE = (w: number) => `${u(w)} solid #000`

const PRINT_CSS = `
.pc-sheet-wrap { container-type: inline-size; }
.pc-sheet { --pc-u: calc(100cqw / 595); }
@media print {
  @page { size: A4; margin: 0; }
  html, body { height: auto !important; overflow: visible !important; background: #fff !important; }
  body > *:not(.pc-print-root) { display: none !important; }
  .pc-print-root { position: static !important; display: block !important; padding: 0 !important; background: none !important; overflow: visible !important; }
  .pc-noprint { display: none !important; }
  .pc-sheet-wrap { width: 210mm !important; max-width: none !important; margin: 0 !important; box-shadow: none !important; border-radius: 0 !important; }
  .pc-sheet { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`

function Table({ top, rows }: { top: number; rows: [string, ReactNode][] }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: u(58),
        top: u(top),
        width: u(482),
        border: LINE(1.6),
        display: 'grid',
        gridTemplateColumns: `${u(126)} 1fr`,
      }}
    >
      {rows.map(([k, v], i) => (
        <Fragment key={k}>
          <div
            style={{
              minHeight: u(38),
              background: '#dae3f3',
              borderRight: LINE(1.6),
              borderTop: i ? `${u(0.4)} solid #dae3f3` : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 700,
              fontSize: u(10.5),
              whiteSpace: 'pre',
            }}
          >
            {k}
          </div>
          <div
            style={{
              minHeight: u(38),
              borderTop: i ? LINE(0.6) : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              textAlign: 'center',
              padding: `${u(3)} ${u(10)}`,
              fontSize: u(10.5),
              lineHeight: 1.35,
            }}
          >
            {v}
          </div>
        </Fragment>
      ))}
    </div>
  )
}

export default function PayConfirmSheet({ doc, seal, onClose }: { doc: PayConfirmDoc; seal: string; onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [onClose])

  if (typeof document === 'undefined') return null

  return createPortal(
    <div className="pc-print-root fixed inset-0 z-[70] overflow-y-auto bg-[#0f1b2e]/55 px-4 py-5" role="dialog" aria-modal="true" aria-label="이체확인서">
      <style>{PRINT_CSS}</style>
      <div className="pc-noprint mx-auto mb-3 flex max-w-[640px] items-center gap-2">
        <button
          type="button"
          onClick={() => window.print()}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-[10px] bg-white px-4 py-2.5 font-score text-[14px] font-[500] text-[#1e3a5f] shadow"
        >
          <Printer size={16} />인쇄 / PDF 저장
        </button>
        <button type="button" onClick={onClose} aria-label="닫기" className="rounded-[10px] bg-white/90 p-2.5 text-[#374151] shadow">
          <X size={18} />
        </button>
      </div>
      <p className="pc-noprint mx-auto mb-3 max-w-[640px] text-center font-score text-[12px] leading-[1.5] text-white/85">
        인쇄 창에서 대상을 ‘PDF로 저장’으로 고르면 파일로 받을 수 있습니다. 카카오톡 등 앱 안에서 열린 화면에서 인쇄가 되지 않으면 Chrome·Safari에서 열어 주세요.
      </p>

      <div className="pc-sheet-wrap mx-auto w-full max-w-[640px] overflow-hidden rounded-[4px] bg-white shadow-[0_16px_48px_rgba(15,27,46,0.3)]">
        <div
          className="pc-sheet"
          style={{
            position: 'relative',
            width: '100%',
            height: u(840), // A4 높이(841.9pt)보다 약간 작게 — 반올림으로 빈 둘째 쪽이 생기지 않게
            color: '#000',
            background: '#fff',
            fontFamily: "'Malgun Gothic', '맑은 고딕', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
            letterSpacing: 0,
          }}
        >
          {/* 바깥 테두리 */}
          <div style={{ position: 'absolute', left: u(24.6), top: u(24.6), width: u(548.6), height: u(796.6), border: LINE(1) }} />

          <div style={{ position: 'absolute', left: 0, right: 0, top: u(132), textAlign: 'center', fontSize: u(23), fontWeight: 700, letterSpacing: u(10), paddingLeft: u(10) }}>
            {PAY_CONFIRM.org}
          </div>
          <div style={{ position: 'absolute', left: 0, right: 0, top: u(196), textAlign: 'center', fontSize: u(15) }}>
            &lt;{PAY_CONFIRM.title}&gt;
          </div>

          <Table
            top={261}
            rows={[
              ['프로그램명', doc.programName],
              ['참 여 기 간', doc.period],
              ['장      소', doc.place],
              ['특 이 사 항', doc.note],
            ]}
          />
          <Table
            top={440}
            rows={[
              ['참가비 입금액', doc.amountText],
              ['입 금 자 명', <span key="n" style={{ letterSpacing: u(4), paddingLeft: u(4) }}>{doc.payerName}</span>],
              ['입 금 방 법', doc.method],
            ]}
          />

          <div style={{ position: 'absolute', left: 0, right: 0, top: u(558), textAlign: 'center', fontSize: u(10) }}>{PAY_CONFIRM.notice}</div>

          <div style={{ position: 'absolute', left: 0, right: 0, top: u(620), textAlign: 'center', fontSize: u(15), fontWeight: 700 }}>{doc.issuedText}</div>

          <div style={{ position: 'absolute', left: u(265), top: u(664), fontSize: u(20) }}>{doc.org}</div>
          {/* eslint-disable-next-line @next/next/no-img-element -- 인증 응답의 data URL(공개 경로 없음) */}
          <img src={seal} alt="체육교육회 직인" style={{ position: 'absolute', left: u(345), top: u(646.5), width: u(65.25), height: u(65.25) }} />
        </div>
      </div>
    </div>,
    document.body,
  )
}
