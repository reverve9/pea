'use client'

import React, { useEffect, useState } from 'react'
import { Mountain } from 'lucide-react'

export interface Slide {
  src?: string // 미수급 시 비우면 브랜드 플레이스홀더 표시
  alt?: string
}

// 재사용 이미지 슬라이더(자동 순환 + 인디케이터). PWA 페인 폭(~320~500px 유동→고정) 대응 =
// 고정 높이 대신 aspect-ratio 로 폭 따라 스케일. sm:/md: 뷰포트 분기 없음.
// 갤러리·프로그램 등에서도 재사용 가능. src 없는 슬라이드는 플레이스홀더(사진 수급 전).
export default function ImageSlider({
  slides,
  interval = 5000,
  aspectClass = 'aspect-[16/10]',
}: {
  slides: Slide[]
  interval?: number
  aspectClass?: string
}) {
  const [idx, setIdx] = useState(0)
  const count = slides.length

  useEffect(() => {
    if (count <= 1) return
    const t = setInterval(() => setIdx((p) => (p + 1) % count), interval)
    return () => clearInterval(t)
  }, [count, interval])

  if (count === 0) return null

  return (
    <div className={`relative w-full ${aspectClass} overflow-hidden bg-[#eef2f6]`}>
      <div
        className="flex h-full transition-transform duration-700 ease-out"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {slides.map((s, i) => (
          <div key={i} className="relative min-w-full h-full">
            {s.src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={s.src} alt={s.alt || ''} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[#dbe4ee] to-[#eef2f6] text-[#9fb0c3]">
                <Mountain size={40} strokeWidth={1.25} />
                <span className="text-[12px] tracking-wide">{s.alt || '사진 준비중'}</span>
              </div>
            )}
          </div>
        ))}
      </div>

      {count > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`슬라이드 ${i + 1}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === idx ? 'w-5 bg-white' : 'w-1.5 bg-white/60 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  )
}
