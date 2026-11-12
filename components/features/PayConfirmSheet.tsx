'use client'

import { Fragment, useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { Printer, X } from 'lucide-react'
import { PAY_CONFIRM, type PayConfirmDoc } from '@/lib/payConfirm'

// 이체확인서 — A4 세로(595×842pt). 항목은 클라이언트 양식(_ref 참가 및 납부확인서) 그대로, 조판은 브릿지나인 문서 스타일:
// 페이퍼로지 = 제목·블록 소제목 / 프리텐다드 = 본문·표·숫자, 자간 -2%, 그림자 없음, 강조는 연회색 패널 1곳(입금액).
// 1단위 = 시트 폭/595 (container query) → 화면 폭에 맞춰 축소, 인쇄 시 시트 폭 210mm 로 원본 크기.
// 인쇄: 이 포털만 남기고 페이지 나머지를 숨긴다(@media print). 브라우저 인쇄 창에서 'PDF로 저장' 가능.

const u = (n: number) => `calc(var(--pc-u) * ${n})`

const NAVY = '#1D2A55' // 체육교육회 CI
const INK = '#1F2633'
const MUTED = '#6C7686'
const LINE = '#E6EAF1'
const PANEL = '#F4F6FA'
const SANS = "'Pretendard', -apple-system, BlinkMacSystemFont, 'Apple SD Gothic Neo', sans-serif"
const TITLE = "'Paperlogy', 'Pretendard', sans-serif"
const NOON = 'https://cdn.jsdelivr.net/gh/projectnoonnu/2408-3@1.0'

const PRINT_CSS = `
@font-face { font-family: 'Paperlogy'; src: url('${NOON}/Paperlogy-6SemiBold.woff2') format('woff2'); font-weight: 600; font-display: swap; }
@font-face { font-family: 'Paperlogy'; src: url('${NOON}/Paperlogy-7Bold.woff2') format('woff2'); font-weight: 700; font-display: swap; }
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

// 블록 소제목 — 번호(아웃라인 숫자 대신 작은 네이비 숫자) + 페이퍼로지 라벨 + 네이비 상단선
function Section({ no, title, children }: { no: string; title: string; children: ReactNode }) {
  return (
    <div style={{ marginTop: u(30) }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: u(8), paddingBottom: u(9), borderBottom: `${u(1.4)} solid ${NAVY}` }}>
        <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: u(9.5), color: NAVY, letterSpacing: '0.02em' }}>{no}</span>
        <span style={{ fontFamily: TITLE, fontWeight: 600, fontSize: u(12.5), color: NAVY, letterSpacing: '-0.02em' }}>{title}</span>
      </div>
      {children}
    </div>
  )
}

function Rows({ rows }: { rows: [string, ReactNode][] }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${u(104)} 1fr` }}>
      {rows.map(([k, v]) => (
        <Fragment key={k}>
          <div style={{ padding: `${u(11)} 0`, borderBottom: `${u(0.75)} solid ${LINE}`, fontSize: u(10), fontWeight: 500, color: MUTED }}>{k}</div>
          <div style={{ padding: `${u(11)} 0`, borderBottom: `${u(0.75)} solid ${LINE}`, fontSize: u(11), fontWeight: 600, color: INK, lineHeight: 1.5 }}>{v}</div>
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

  // 웹폰트(페이퍼로지)가 다 받아진 뒤 인쇄 — 대체 글꼴로 찍히는 것 방지.
  const print = async () => {
    try {
      await document.fonts?.ready
    } catch {
      /* 무시 */
    }
    window.print()
  }

  if (typeof document === 'undefined') return null

  const empty = <span style={{ color: '#B6BDC8', fontWeight: 500 }}>—</span>

  return createPortal(
    <div className="pc-print-root fixed inset-0 z-[70] overflow-y-auto bg-[#0f1b2e]/55 px-4 py-5" role="dialog" aria-modal="true" aria-label="이체확인서">
      <style>{PRINT_CSS}</style>
      <div className="pc-noprint mx-auto mb-3 flex max-w-[640px] items-center gap-2">
        <button
          type="button"
          onClick={print}
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
            background: '#fff',
            color: INK,
            fontFamily: SANS,
            letterSpacing: '-0.02em',
            display: 'flex',
            flexDirection: 'column',
            padding: `${u(44)} ${u(58)} ${u(36)}`,
            boxSizing: 'border-box',
          }}
        >
          {/* 상단 정보 띠 — 좌 로고 / 우 확인서 번호(신청번호) 작고 연하게 */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: u(14), borderBottom: `${u(0.75)} solid ${LINE}` }}>
            {/* eslint-disable-next-line @next/next/no-img-element -- 인쇄 시트 내 고정 크기 로고 */}
            <img src="/logo/pea-logo-navy.png" alt="체육교육회" style={{ height: u(24), width: 'auto' }} />
            <span style={{ fontSize: u(9), fontWeight: 500, color: '#9AA3B2', letterSpacing: '0.02em', fontVariantNumeric: 'tabular-nums' }}>No. {doc.docNo}</span>
          </div>

          {/* 제목 */}
          <div style={{ marginTop: u(52) }}>
            <div style={{ fontFamily: TITLE, fontWeight: 700, fontSize: u(30), color: NAVY, letterSpacing: '-0.02em', lineHeight: 1.2 }}>{PAY_CONFIRM.title.replace(' ', '')}</div>
            <div style={{ marginTop: u(10), fontSize: u(10.5), fontWeight: 500, color: MUTED, lineHeight: 1.7 }}>
              {PAY_CONFIRM.org} 연수 참가비 납부 사실 확인 — 아래 내용과 같음
            </div>
          </div>

          <Section no="01" title="연수 정보">
            <Rows
              rows={[
                ['프로그램명', doc.programName],
                ['참여기간', doc.period],
                ['장소', doc.place],
                ['특이사항', doc.note || empty],
              ]}
            />
          </Section>

          <Section no="02" title="납부 정보">
            {/* 강조 1곳 — 입금액 연회색 패널 */}
            <div style={{ marginTop: u(12), background: PANEL, borderRadius: u(6), padding: `${u(16)} ${u(18)}`, display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
              <span style={{ fontSize: u(10), fontWeight: 500, color: MUTED }}>참가비 입금액</span>
              <span style={{ fontSize: u(22), fontWeight: 700, color: NAVY, letterSpacing: '-0.01em', fontVariantNumeric: 'tabular-nums' }}>{doc.amountText}</span>
            </div>
            <Rows
              rows={[
                ['입금자명', doc.payerName],
                ['입금방법', doc.method],
              ]}
            />
          </Section>

          <div style={{ marginTop: u(14), fontSize: u(9), fontWeight: 500, color: MUTED, lineHeight: 1.7 }}>{PAY_CONFIRM.notice}</div>

          {/* 발급 — 날짜 + 기관명·직인 */}
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', paddingBottom: u(26) }}>
            <div style={{ fontSize: u(12.5), fontWeight: 600, color: INK, fontVariantNumeric: 'tabular-nums' }}>{doc.issuedText}</div>
            <div style={{ position: 'relative', marginTop: u(22), display: 'flex', alignItems: 'center' }}>
              <span style={{ fontFamily: TITLE, fontWeight: 700, fontSize: u(21), color: INK, letterSpacing: '0.18em', paddingLeft: u(4) }}>{doc.org}</span>
              {/* eslint-disable-next-line @next/next/no-img-element -- 인증 응답의 data URL(공개 경로 없음) */}
              <img src={seal} alt="체육교육회 직인" style={{ position: 'absolute', right: u(-48), top: '50%', transform: 'translateY(-50%)', width: u(60), height: u(60) }} />
            </div>
          </div>

          {/* 하단 */}
          <div style={{ paddingTop: u(12), borderTop: `${u(0.75)} solid ${LINE}`, textAlign: 'center', fontSize: u(8), fontWeight: 500, color: '#9AA3B2' }}>
            본 확인서는 {PAY_CONFIRM.org} 홈페이지 마이페이지에서 발급되었습니다
          </div>
        </div>
      </div>
    </div>,
    document.body,
  )
}
