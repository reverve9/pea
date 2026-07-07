// 소개형/브랜드 페이지 우측 페인 상단 실사 듀오톤 히어로(공용).
// 홈 HomeCourses.Bg 기법: 그라디언트 폴백 + 실사 + (옵션)네이비 오버레이 + 스크림 위 텍스트.
// imgs 2장이면 두 번째(top)를 사선 마스크로 첫 번째(base) 위 블렌드(프로그램=스키+스노보드 2컷).
// 1장이면 단일 컷(신청 등). 베이크 듀오톤이면 tint=0(CSS 오버레이 없이 구운 톤만).
// 재베이크: _DEV/bake_hero.py(2컷) / _DEV/bake_hero_apply.py(1컷).
const NAVY = '#1e3a5f'

export default function DuotoneHero({
  eyebrow,
  title,
  imgs,
  tint = 0.34,
  ratioClass = 'aspect-[7/2]',
}: {
  eyebrow: string
  title: string
  imgs?: string[]
  tint?: number
  // ratioClass: 비율 오버라이드(기본 7:2). 모바일 히어로는 2.5:1(aspect-[5/2]).
  ratioClass?: string
}) {
  const base = imgs?.[0]
  const top = imgs?.[1]
  return (
    <div className={`relative mb-10 overflow-hidden rounded-[12px] ${ratioClass}`}>
      {/* 폴백 그라디언트 (이미지 없거나 404 시 그대로 노출) */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#2c3e57] to-[#16304f]" />
      {/* 베이스 실사 */}
      {base && <div aria-hidden className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: `url(${base})` }} />}
      {/* 블렌드 실사(2컷) — 우측에서 사선 페이드 */}
      {top && (
        <div
          aria-hidden
          className="absolute inset-0 bg-cover bg-center"
          style={{
            backgroundImage: `url(${top})`,
            WebkitMaskImage: 'linear-gradient(115deg, transparent 38%, #000 62%)',
            maskImage: 'linear-gradient(115deg, transparent 38%, #000 62%)',
          }}
        />
      )}
      {/* 네이비 듀오톤 오버레이 — 베이크 듀오톤이면 tint=0. */}
      {(base || top) && tint > 0 && <div aria-hidden className="absolute inset-0" style={{ backgroundColor: NAVY, opacity: tint }} />}
      {/* 텍스트 스크림 */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
      {/* 텍스트 오버레이 — 이 국영문이 히어로 타이틀 역할(모바일은 위쪽 텍스트 타이틀 영역 제거). */}
      <div className="absolute inset-x-0 bottom-0 p-[clamp(1.25rem,6cqi,1.75rem)]">
        <p className="font-raleway text-[clamp(0.6875rem,2.6cqi,0.75rem)] font-[400] uppercase tracking-[3px] text-[#a9e0ea]">
          {eyebrow}
        </p>
        <p className="mt-1 font-score text-[clamp(0.75rem,3.6cqi,1.125rem)] font-[300] tracking-[1px] text-white">
          {title}
        </p>
      </div>
    </div>
  )
}
