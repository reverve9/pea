import Link from 'next/link'
import Image from 'next/image'
import { PLACEHOLDER_ORG as ORG } from '@/lib/siteMeta'

// 공용 슬림 푸터 — 홈(리치 HomeFooter) 제외 전 페이지 하단(PWANavigation main 끝).
// 법적/신뢰 최소정보만: 기관명·대표자·개인정보처리방침 링크 + 저작권 1줄. 미니멀·무채색.
// 값 = siteMeta placeholder(리치 푸터와 공용), site_settings 연동 전.
export default function SlimFooter() {
  const year = new Date().getFullYear()

  return (
    <footer className="mt-20 border-t border-black/[0.06] px-4 py-5">
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px] font-[300] text-[#9ca3af]">
        <Image
          src="/logo/pea-logo-mono.png"
          alt={ORG.name}
          width={1890}
          height={400}
          className="h-[15px] w-auto opacity-60"
        />
        <span aria-hidden className="text-black/10">|</span>
        <span>대표 {ORG.ceo}</span>
        <span aria-hidden className="text-black/10">|</span>
        <Link
          href="/privacy"
          className="text-[#4b5563] underline-offset-2 hover:underline"
        >
          개인정보처리방침
        </Link>
      </div>
      <p className="mt-2 text-center text-[11px] font-[200] text-[#9ca3af]">
        © {year}. {ORG.name}. All rights reserved.
      </p>
    </footer>
  )
}
