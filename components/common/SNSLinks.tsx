import React from 'react'

// 나인브릿지 SNSLinks 이식. 원본은 `@/lib/siteSettings` 타입에 의존했으나
// 단일 앱 자립성을 위해 순수 url 맵(SNSUrls)을 받도록 디커플. 실제 값은 후속(site_settings)에서 주입.

const SNS_ICONS = {
  kakao: (
    <path d="M12 3C6.48 3 2 6.58 2 11c0 2.8 1.8 5.27 4.5 6.72l-.9 3.28c-.1.36.28.66.6.48l3.88-2.25c.63.1 1.28.15 1.92.15 5.52 0 10-3.58 10-8s-4.48-8-10-8z" />
  ),
  instagram: (
    <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
  ),
  youtube: (
    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
  ),
  facebook: (
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  ),
} as const

const SNS_LABELS: Record<string, string> = {
  kakao: '카카오톡',
  instagram: '인스타그램',
  youtube: '유튜브',
  facebook: '페이스북',
}

export type SNSKey = keyof typeof SNS_ICONS
export type SNSUrls = Partial<Record<SNSKey, string | null | undefined>>

interface SNSLinksProps {
  urls: SNSUrls
  variant: 'icon' | 'icon-sm' | 'button'
}

function getSNSItems(urls: SNSUrls): { key: SNSKey; url: string }[] {
  return (Object.keys(SNS_ICONS) as SNSKey[])
    .map((key) => ({ key, url: urls[key] }))
    .filter((e): e is { key: SNSKey; url: string } => !!e.url)
}

export default function SNSLinks({ urls, variant }: SNSLinksProps) {
  const items = getSNSItems(urls)
  if (items.length === 0) return null

  if (variant === 'button') {
    return (
      <>
        {items.map(({ key, url }) => (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 border border-[#ddd] bg-white text-[#333] text-[13px] font-medium rounded-[4px] hover:bg-[#f9f9f9] transition-colors"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              {SNS_ICONS[key]}
            </svg>
            {SNS_LABELS[key]}
          </a>
        ))}
      </>
    )
  }

  if (variant === 'icon-sm') {
    return (
      <div className="flex items-center gap-2">
        {items.map(({ key, url }) => (
          <a
            key={key}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="w-6 h-6 bg-[#e0e0e0] rounded-full flex items-center justify-center hover:bg-[#d5d5d5] transition-colors text-[#777]"
          >
            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
              {SNS_ICONS[key]}
            </svg>
          </a>
        ))}
      </div>
    )
  }

  // variant === 'icon'
  return (
    <div className="flex items-center gap-2">
      {items.map(({ key, url }) => (
        <a
          key={key}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="w-8 h-8 bg-[#f5f5f5] rounded-full flex items-center justify-center hover:bg-[#e5e5e5] transition-colors text-[#666]"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
            {SNS_ICONS[key]}
          </svg>
        </a>
      ))}
    </div>
  )
}
