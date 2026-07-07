'use client'

import React from 'react'
import { Pin, HelpCircle, MessageSquare, UserCheck, Lock, ChevronRight } from 'lucide-react'
import SectionTitle from '@/components/common/SectionTitle'
import MasterCard from '@/components/common/MasterCard'
import Text from '@/components/common/Text'
import { Badge } from '@/components/common/Badge'
import { NOTICE_CATEGORY, formatDate } from '@/lib/display'
import type { Notice } from '@/lib/types'

// 좌측 인덱스. 섹션타이틀(공지사항 / 도움말·문의) 유지.
// 위계: 공지사항 아래 개별 공지는 컨테이너 카드 '안의 행'(하위) / 도움말·문의 아래 FAQ·문의·마이는 '카드'.
// 클릭 → 상위(page): 데스크탑=우측 영역 점프 / 모바일=모달.
export type Selection = { kind: 'notice'; id: string } | { kind: 'faq' } | { kind: 'inquiry' }

interface Props {
  notices: Notice[]
  faqCount: number
  onSelect: (sel: Selection) => void
  selectedNoticeId?: string | null
  // 공지 페이지네이션 노드(섹션타이틀 우측). 5개 이하면 상위에서 null.
  pagination?: React.ReactNode
}

function pinnedFirst(a: Notice, b: Notice) {
  if (a.is_pinned && !b.is_pinned) return -1
  if (!a.is_pinned && b.is_pinned) return 1
  const ad = (a.published_at ?? a.created_at) ?? ''
  const bd = (b.published_at ?? b.created_at) ?? ''
  return bd.localeCompare(ad)
}

export default function CommunityNewsList({ notices, faqCount, onSelect, selectedNoticeId, pagination }: Props) {
  const shown = [...notices].sort(pinnedFirst)

  return (
    <div>
      {/* 공지사항 — 섹션타이틀 + 배경 위 리스트(박스 없음, 하이라인 구분선만). 제목·배지·날짜 + 1줄 요약 */}
      <section className="px-8">
        <SectionTitle title="공지사항" rail right={pagination} />
        {shown.length === 0 ? (
          <Text as="p" variant="sub" color="#9ca3af" className="py-6 text-center">등록된 공지가 없습니다.</Text>
        ) : (
          <ul className="divide-y divide-[#eef1f5] border-y border-[#eef1f5]">
            {shown.map((n) => {
              const cat = NOTICE_CATEGORY[n.category]
              const selected = selectedNoticeId === n.id
              const date = formatDate((n.published_at ?? n.created_at).slice(0, 10))
              return (
                <li key={n.id}>
                  <button
                    onClick={() => onSelect({ kind: 'notice', id: n.id })}
                    className={[
                      'block w-full px-1 py-3 text-left transition-colors',
                      selected ? 'bg-[#f1f6fb]' : 'hover:bg-[#f7f9fb]',
                    ].join(' ')}
                  >
                    <div className="flex items-center gap-2">
                      {n.is_pinned && <Pin size={12} className="shrink-0 text-[#a65546]" fill="currentColor" />}
                      <Badge color={cat.color} size="sm" className="shrink-0">
                        {cat.label}
                      </Badge>
                      <Text variant="card-title-sm" className="min-w-0 flex-1 truncate">
                        {n.title}
                      </Text>
                      <Text variant="date" className="shrink-0">{date}</Text>
                    </div>
                    {n.content && (
                      <Text as="p" variant="card-sub" className="mt-1 line-clamp-1">{n.content}</Text>
                    )}
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {/* 도움말 · 문의 — 섹션타이틀 + 동위 카드(FAQ / 1:1문의 / 마이페이지) */}
      <section className="mt-8 px-8">
        <SectionTitle title="도움말 · 문의" rail />
        <div className="space-y-4">
          <BundleCard
            icon={<HelpCircle size={18} />}
            title="자주 묻는 질문"
            desc="궁금한 점을 빠르게 확인하세요"
            meta={faqCount > 0 ? `${faqCount}건` : undefined}
            onClick={() => onSelect({ kind: 'faq' })}
          />
          <BundleCard
            icon={<MessageSquare size={18} />}
            title="1:1 문의"
            desc="연수 · 신청 · 환불 등 궁금한 점"
            lock
            onClick={() => onSelect({ kind: 'inquiry' })}
          />
          <BundleCard
            icon={<UserCheck size={18} />}
            title="내 신청 · 입금 확인"
            desc="전화번호 인증 후 신청 확인 · 입금 확인"
            href="/my"
            solid
          />
        </div>
      </section>
    </div>
  )
}

function BundleCard({
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
  const inner = (
    <>
      <span
        className={[
          'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
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
        <Text as="span" variant="card-sub" className="mt-0.5 block truncate">{desc}</Text>
      </span>
      <ChevronRight size={17} className="shrink-0 text-[#c0c6cd]" />
    </>
  )

  return (
    <MasterCard href={href} onClick={onClick} className="p-4">
      <div className="flex items-center gap-3">{inner}</div>
    </MasterCard>
  )
}
