'use client'

import Link from 'next/link'
import { CheckCircle2 } from 'lucide-react'
import Text, { BTN } from '@/components/common/Text'

// 신청 완료 화면 — 신청번호를 크게 노출(사용자 보관용). 직무=네이비 / 자율=그린 accent.
// [[application-plan-reference]] ⑦ 신청 확인: 번호 보관 + 마이페이지 안내.
export default function ApplyComplete({ applicationNo, accent }: { applicationNo: string; accent: string }) {
  return (
    <div className="py-6">
      <div className="mx-auto max-w-[420px] rounded-[14px] border border-[#e5eaef] bg-white p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: accent + '14' }}>
          <CheckCircle2 size={30} style={{ color: accent }} />
        </div>
        <Text variant="card-title" as="h3">신청이 접수되었습니다</Text>
        <Text variant="sub" as="p" className="mt-2 text-[#6b7280]">아래 신청번호를 꼭 보관해 주세요.<br />마이페이지에서 진행 상태를 확인할 수 있습니다.</Text>

        <div className="mt-4 rounded-[10px] border border-dashed p-4" style={{ borderColor: accent + '55', background: accent + '08' }}>
          <Text variant="caption" as="p" className="text-[#8a94a0]">신청번호</Text>
          <p className="mt-1 font-score text-[26px] font-[700] tabular-nums tracking-tight" style={{ color: accent }}>{applicationNo}</p>
        </div>

        <div className="mt-4 rounded-[10px] bg-[#f7f9fb] p-4 text-left">
          <Text variant="sub" as="p" className="text-[#4b5563]">
            안내에 따라 <b>무통장 입금</b>을 완료하시면 접수가 확정됩니다. 신청자명과 입금자명이 다르면 확정이 지연될 수 있습니다.
          </Text>
        </div>

        <Link href="/my" className={`mt-5 block rounded-[10px] py-3 ${BTN} text-white transition-colors`} style={{ background: accent }}>
          마이페이지에서 확인
        </Link>
      </div>
    </div>
  )
}
