'use client'

import { useEffect, useState } from 'react'
import { X, Share, Plus } from 'lucide-react'

// 모바일 전용 PWA 설치 안내 배너(헤더 아래 슬림 바). 닫으면 7일간 미노출(localStorage 스누즈).
// 이미 설치(standalone)면 숨김. iOS=수동 안내(공유→홈추가) / Android=beforeinstallprompt 캡처 시 '설치' 버튼.
const SNOOZE_KEY = 'pwa-banner-snooze-until'
const WEEK_MS = 7 * 24 * 60 * 60 * 1000

type BIPEvent = Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> }

export default function PwaInstallBanner() {
  const [show, setShow] = useState(false)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')
  const [deferred, setDeferred] = useState<BIPEvent | null>(null)

  useEffect(() => {
    // 이미 홈화면 앱(standalone)으로 실행 중이면 안내 불필요
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    if (standalone) return

    // 7일 스누즈 유효하면 노출 안 함
    const until = Number(localStorage.getItem(SNOOZE_KEY) || 0)
    if (Date.now() < until) return

    const ua = window.navigator.userAgent
    const isIOS = /iphone|ipad|ipod/i.test(ua) && !/crios|fxios/i.test(ua) // iOS Safari 계열
    const isAndroid = /android/i.test(ua)
    setPlatform(isIOS ? 'ios' : isAndroid ? 'android' : 'other')

    // Android/Chrome 설치 프롬프트 캡처(가능하면 '설치' 버튼 활성)
    const onPrompt = (e: Event) => {
      e.preventDefault()
      setDeferred(e as BIPEvent)
    }
    window.addEventListener('beforeinstallprompt', onPrompt)

    setShow(true)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  const dismiss = () => {
    localStorage.setItem(SNOOZE_KEY, String(Date.now() + WEEK_MS))
    setShow(false)
  }

  const install = async () => {
    if (!deferred) return
    deferred.prompt()
    await deferred.userChoice
    setDeferred(null)
    dismiss()
  }

  if (!show) return null

  return (
    <div className="md:hidden flex items-center gap-2.5 border-b border-[#e5eaef] bg-[#f4f7fb] px-4 py-2.5">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/icons/icon-192.png" alt="" className="h-7 w-7 shrink-0 rounded-[7px]" />
      <div className="min-w-0 flex-1">
        <p className="font-score text-[13px] font-[500] leading-tight text-[#1e3a5f]">홈 화면에 추가하고 앱처럼 이용하세요</p>
        {platform === 'ios' ? (
          <p className="mt-0.5 flex flex-wrap items-center gap-x-1 font-score text-[11.5px] font-[300] text-[#6b7280]">
            공유 <Share size={12} /> 를 눌러 &lsquo;홈 화면에 추가&rsquo; <Plus size={12} />
          </p>
        ) : (
          <p className="mt-0.5 font-score text-[11.5px] font-[300] text-[#6b7280]">브라우저 메뉴에서 &lsquo;앱 설치&rsquo;를 선택하세요</p>
        )}
      </div>
      {platform === 'android' && deferred && (
        <button
          type="button"
          onClick={install}
          className="shrink-0 rounded-[7px] bg-[#1e3a5f] px-3 py-1.5 font-score text-[12px] font-[500] text-white"
        >
          설치
        </button>
      )}
      <button type="button" onClick={dismiss} aria-label="배너 닫기" className="shrink-0 p-1 text-[#9ca3af]">
        <X size={16} />
      </button>
    </div>
  )
}
