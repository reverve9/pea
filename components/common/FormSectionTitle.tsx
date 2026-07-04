'use client'

// 폼 내부 섹션 구분 제목 — 앞 블랙 세로바(폭 6px, 텍스트 베이스라인 정렬) + 13px / 300 / 블랙.
export default function FormSectionTitle({ title }: { title: string }) {
  return (
    <h3 className="mb-4 flex items-baseline gap-2 font-score text-[clamp(0.71875rem,3.08cqi,0.8125rem)] font-[300] leading-tight text-black">
      <span className="relative top-[2px] h-[14px] w-[6px] shrink-0 rounded-[2px] bg-black" />
      {title}
    </h3>
  )
}
