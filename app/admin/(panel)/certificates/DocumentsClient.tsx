'use client'

import { useState } from 'react'
import AdminTabs from '@/components/admin/AdminTabs'
import CertificatesClient from './CertificatesClient'
import CashReceiptsClient from './CashReceiptsClient'
import type { CertificateRosterRow, CashReceiptAdminRow } from '@/lib/types'

// 증명서 발급 — 수료증 / 현금영수증 탭 분리(행 단위·컬럼이 달라 통합표는 어색 → 정본 AdminTabs 세그먼트).
// 수료증 = 참가자별 발급 원장(수동 발급). 현금영수증 = 신청별 발급/취소 이벤트(입금확인 시 자동). [[cash-receipt-spec]]
type Tab = 'completion' | 'cash_receipt'

export default function DocumentsClient({
  roster,
  receipts,
}: {
  roster: CertificateRosterRow[]
  receipts: CashReceiptAdminRow[]
}) {
  const [tab, setTab] = useState<Tab>('completion')
  return (
    <>
      <AdminTabs<Tab>
        tabs={[
          { key: 'completion', label: '수료증', count: roster.length },
          { key: 'cash_receipt', label: '현금영수증', count: receipts.length },
        ]}
        value={tab}
        onChange={setTab}
        className="mb-4"
      />
      {tab === 'completion' ? <CertificatesClient roster={roster} /> : <CashReceiptsClient receipts={receipts} />}
    </>
  )
}
