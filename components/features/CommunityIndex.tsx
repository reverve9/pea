'use client'

import React from 'react'
import { Megaphone, HelpCircle, MessageSquare, UserCheck, Lock, ChevronRight } from 'lucide-react'
import MasterCard from '@/components/common/MasterCard'
import Text from '@/components/common/Text'

// 커뮤니티 좌측 인덱스 — 동위 카드 4개(공지사항 / 자주 묻는 질문 / 1:1 문의 / 내 신청·입금 확인).
// 좌측에 공지 리스트를 따로 깔지 않는다: 같은 목록이 우 페인에도 그대로 나와 중복이었고,
// 섹션 라벨(공지사항 / 도움말·문의)도 카드 제목과 겹쳐 걷어냈다 → 네 개가 한 층위의 진입점.
// 클릭 → 상위(page): 데스크탑 = 우측 해당 영역으로 점프 / 모바일 = 모달. [[left-card-mastercard]]
export type Selection = { kind: 'notices' } | { kind: 'faq' } | { kind: 'inquiry' }

export default function CommunityIndex({
  noticeCount,
  faqCount,
  onSelect,
}: {
  noticeCount: number
  faqCount: number
  onSelect: (sel: Selection) => void
}) {
  return (
    // 좌우 여백 px-8 — 좌측 페인 마스터 표준. [[left-pane-padding-px8]]
    <section className="space-y-5 px-8">
      <IndexCard
        icon={<Megaphone size={20} />}
        title="공지사항"
        desc="연수 · 신청 관련 안내를 확인하세요"
        meta={noticeCount > 0 ? `${noticeCount}건` : undefined}
        onClick={() => onSelect({ kind: 'notices' })}
      />
      <IndexCard
        icon={<HelpCircle size={20} />}
        title="자주 묻는 질문"
        desc="궁금한 점을 빠르게 확인하세요"
        meta={faqCount > 0 ? `${faqCount}건` : undefined}
        onClick={() => onSelect({ kind: 'faq' })}
      />
      <IndexCard
        icon={<MessageSquare size={20} />}
        title="1:1 문의"
        desc="연수 · 신청 · 환불 등 궁금한 점"
        lock
        onClick={() => onSelect({ kind: 'inquiry' })}
      />
      <IndexCard
        icon={<UserCheck size={20} />}
        title="내 신청 · 입금 확인"
        desc="전화번호 인증 후 신청 확인 · 입금 확인"
        href="/my"
        solid
      />
    </section>
  )
}

function IndexCard({
  icon,
  title,
  desc,
  meta,
  lock,
  onClick,
  href,
  solid,
}: {
  icon: React.ReactNode
  title: string
  desc: string
  meta?: string
  lock?: boolean
  onClick?: () => void
  href?: string
  // solid: 마이페이지 등 강조 진입 — 아이콘 칩을 솔리드 네이비로.
  solid?: boolean
}) {
  return (
    <MasterCard href={href} onClick={onClick} className="px-5 py-5">
      <div className="flex items-center gap-3.5">
        <span
          className={[
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-full',
            solid ? 'bg-[#1e3a5f] text-white' : 'bg-[#1e3a5f]/[0.07] text-[#1e3a5f]',
          ].join(' ')}
        >
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1.5">
            <Text variant="card-title">{title}</Text>
            {lock && <Lock size={12} className="text-[#9ca3af]" />}
            {meta && <Text variant="date">{meta}</Text>}
          </span>
          <Text as="span" variant="card-sub" className="mt-1 block truncate">{desc}</Text>
        </span>
        <ChevronRight size={17} className="shrink-0 text-[#c0c6cd]" />
      </div>
    </MasterCard>
  )
}
