'use client'

import Link from 'next/link'
import { CheckCircle2, Clock } from 'lucide-react'
import Text, { BTN } from '@/components/common/Text'

// 신청 완료 화면 — 신청번호를 크게 노출(사용자 보관용). 직무=네이비 / 자율=그린 accent.
// waitlisted=정원 초과 예비(대기) 접수 → 문구·안내를 명확히 구분(입금은 편입 확정 후). [[application-plan-reference]] ⑦
export default function ApplyComplete({
  applicationNo,
  accent,
  waitlisted = false,
}: {
  applicationNo: string
  accent: string
  waitlisted?: boolean
}) {
  // 예비 접수는 대기 성격이라 accent 대신 뉴트럴 앰버 톤으로(입금 확정 유도 방지).
  const tone = waitlisted ? '#c2751a' : accent
  return (
    <div className="py-6">
      <div className="mx-auto max-w-[420px] rounded-[14px] border border-[#e5eaef] bg-white p-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full" style={{ background: tone + '14' }}>
          {waitlisted ? <Clock size={30} style={{ color: tone }} /> : <CheckCircle2 size={30} style={{ color: tone }} />}
        </div>
        <Text variant="card-title" as="h3">
          {waitlisted ? '예비(대기)로 접수되었습니다' : '신청이 접수되었습니다'}
        </Text>
        <Text variant="sub" as="p" className="mt-2 text-[#6b7280]">
          아래 신청번호를 꼭 보관해 주세요.<br />마이페이지에서 진행 상태를 확인할 수 있습니다.
        </Text>

        <div className="mt-4 rounded-[10px] border border-dashed p-4" style={{ borderColor: tone + '55', background: tone + '08' }}>
          <Text variant="caption" as="p" className="text-[#8a94a0]">신청번호</Text>
          <p className="mt-1 font-score text-[26px] font-[700] tabular-nums tracking-tight" style={{ color: tone }}>{applicationNo}</p>
        </div>

        {waitlisted ? (
          <div className="mt-4 rounded-[10px] border border-[#f0d9a8] bg-[#fffaf0] p-4 text-left">
            <Text variant="sub" as="p" className="font-[500] text-[#8a4b00]">정원 마감 — 예비(대기) 접수</Text>
            <Text variant="sub" as="p" className="mt-1.5 text-[#4b5563]">
              선택하신 차수는 정원이 마감되어 <b>예비(대기)</b>로 접수되었습니다. 취소 발생 시 접수 순서대로 편입을 안내드리며, <b>참가가 보장되지는 않습니다</b>.
            </Text>
            <Text variant="sub" as="p" className="mt-1.5 text-[#4b5563]">
              <b>입금은 지금 하지 마시고</b>, 정원 편입(확정) 안내를 받으신 뒤 진행해 주세요.
            </Text>
          </div>
        ) : (
          <div className="mt-4 rounded-[10px] bg-[#f7f9fb] p-4 text-left">
            <Text variant="sub" as="p" className="text-[#4b5563]">
              안내에 따라 <b>무통장 입금</b>을 완료하시면 접수가 확정됩니다. 신청자명과 입금자명이 다르면 확정이 지연될 수 있습니다.
            </Text>
          </div>
        )}

        <Link href="/my" className={`mt-5 block rounded-[10px] py-3 ${BTN} text-white transition-colors`} style={{ background: tone }}>
          마이페이지에서 확인
        </Link>
      </div>
    </div>
  )
}
