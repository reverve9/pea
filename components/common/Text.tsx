'use client'

import React from 'react'

// 텍스트 역할(role) 티어 — 흩어진 폰트 스타일을 한 곳에서 관리. 위계 = 크기·컬러·굵기(볼드≠강조).
// 레이아웃(block·mt·w 등)은 className으로, 타이포(패밀리·크기·굵기·컬러·행간)만 variant로.
// 색은 기본값 내장, accent 등 예외만 color prop으로 override(인라인 style이 클래스보다 우선).
//
// 정본 = 연수안내(/courses) 데스크탑. 값 튜닝은 아래 VARIANT 한 곳에서 → 전 페이지 일괄 반영.
// 크기는 cqi 클램프(컨테이너 비례) — 데스크탑은 max 캡, 모바일/모달은 컨테이너 폭 기준 축소. [[type-scale-cqi-system]]
export type TextVariant =
  | 'page-title'
  | 'page-eyebrow'
  | 'section'
  | 'section-rail'
  | 'card-title'
  | 'card-title-sm'
  | 'card-sub'
  | 'label'
  | 'body'
  | 'sub'
  | 'caption'
  | 'date'
  | 'num'
  | 'num-lg'
  | 'md-h1'
  | 'md-h2'
  | 'md-h3'

export const VARIANT: Record<TextVariant, string> = {
  // ── 페이지 헤더(정체성) — 데스크탑 기준 고정.
  // 국문 페이지 타이틀 — S-CoreDream 라이트·네이비.
  'page-title': 'font-score text-[23px] font-[300] tracking-[2px] leading-none text-[#1e3a5f]',
  // 영문 아이브로우 — Raleway 전용.
  'page-eyebrow': 'font-raleway text-[13px] font-[400] uppercase tracking-[2px] text-[#2f8ba0]',

  // ── 섹션 구분(시안 포인트바는 SectionTitle 컴포넌트가 담당).
  // 섹션 타이틀(정식).
  section: 'font-score text-[clamp(0.9375rem,3.6cqi,1.0625rem)] font-[500] leading-tight text-[#1e3a5f]',
  // 좌측 인덱스 톤(데스크탑 마스터 전용 컴팩트 뮤트 라벨).
  'section-rail': 'font-score text-[12px] font-[500] uppercase tracking-[1.5px] text-[#6b7280]',

  // ── 카드/항목 제목 — 브랜드 폰트·네이비. 모달 제목도 이 티어(모달 container-type가 비례 축소).
  // 표준 카드 제목 — 연수안내 유형카드 정본(3.72). 데스크탑 max 15px.
  'card-title': 'font-score text-[clamp(0.8125rem,3.72cqi,0.9375rem)] font-[500] leading-snug text-[#1e3a5f]',
  // 조밀 리스트 헤더(FAQ·공지·문의 등 항목 밀도 높은 곳). 데스크탑 max 14.5px, 모바일 min 14px(모달 가독성 — 거의 고정).
  'card-title-sm': 'font-score text-[clamp(0.875rem,2.6cqi,0.90625rem)] font-[500] leading-snug text-[#1e3a5f]',
  // 카드 부제/메타 한 줄(일정·학점 등 부가) — 브랜드 폰트, 근블랙(#1f2937·완전 블랙 아님).
  'card-sub': 'font-score text-[clamp(0.6875rem,3.08cqi,0.75rem)] font-[300] leading-snug text-[#1f2937]',

  // ── 라벨/본문/주석.
  // 라벨/아이브로우(연수대상·기관·세부사항·비용) — 뮤트, accent는 color override.
  label: 'font-score text-[clamp(0.71875rem,3.08cqi,0.75rem)] font-[500] text-[#9ca3af]',
  // 주 읽기 값(대상·값·유형 항목) — 브랜드 폰트, near-black.
  body: 'font-score text-[clamp(0.8125rem,3.4cqi,0.875rem)] font-[400] leading-relaxed text-[#374151]',
  // 부차 한 줄(주소·스키복 등) — 읽기 폰트(Pretendard). 데스크탑 max 14px, 모바일 min 13px, 색 #374151.
  sub: 'font-pretendard text-[clamp(0.8125rem,3.08cqi,0.875rem)] font-[300] leading-snug text-[#374151]',
  // 최소 주석(*note) — 읽기 폰트. 컬러는 sub와 동일(#374151), 크기로만 위계. 데스크탑 max 12.5px, 모바일 min 12px.
  caption: 'font-pretendard text-[clamp(0.75rem,2.9cqi,0.78125rem)] font-[400] leading-snug text-[#374151]',

  // ── 날짜/수치.
  // 날짜 메타(작성일 등) — 브랜드 폰트, tabular, 뮤트. 데스크탑 max 12px.
  date: 'font-score text-[clamp(0.59375rem,2.3cqi,0.75rem)] font-[400] tabular-nums text-[#9ca3af]',
  // 금액/수치 — 브랜드 폰트, tabular.
  num: 'font-score text-[clamp(0.8125rem,3.33cqi,0.875rem)] font-[500] tabular-nums text-[#374151]',
  // 큰 금액(총 합계 등) — 강조 네이비.
  'num-lg': 'font-score text-[clamp(1rem,4cqi,1.125rem)] font-[500] tabular-nums text-[#1e3a5f]',

  // ── 마크다운 헤딩 — font-score·숫자 굵기(기존 font-bold 키워드 통일).
  'md-h1': 'font-score text-[clamp(1.1875rem,4.8cqi,1.5rem)] font-[700] leading-tight text-[#1f2937]',
  'md-h2': 'font-score text-[clamp(1rem,4cqi,1.25rem)] font-[600] leading-tight text-[#1f2937]',
  'md-h3': 'font-score text-[clamp(0.9375rem,3.6cqi,1.125rem)] font-[600] leading-snug text-[#1f2937]',
}

// 버튼/CTA 텍스트 토큰(컨트롤) — 크기·굵기·패밀리만. 색은 각 버튼이 지정(솔리드=white / 틴트=navy 등).
// 모든 액션 버튼이 이 하나를 참조 → 모달·폼 CTA 크기 통일(계수·max 드리프트 제거). 모바일 14 → 데스크탑 15.
export const BTN = 'font-score text-[clamp(0.875rem,3.2cqi,0.9375rem)] font-[500]'

type TextProps = {
  variant?: TextVariant
  as?: React.ElementType
  color?: string
  className?: string
  children: React.ReactNode
} & Omit<React.HTMLAttributes<HTMLElement>, 'color'>

export default function Text({
  variant = 'body',
  as: Tag = 'span',
  color,
  className = '',
  style,
  children,
  ...rest
}: TextProps) {
  return (
    <Tag
      className={`${VARIANT[variant]} ${className}`.trim()}
      style={color ? { color, ...style } : style}
      {...rest}
    >
      {children}
    </Tag>
  )
}
