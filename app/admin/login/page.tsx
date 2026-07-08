'use client'

import { Suspense, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function LoginForm() {
  const router = useRouter()
  const params = useSearchParams()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
    if (res.ok) {
      const from = params.get('from')
      router.replace(from && from.startsWith('/admin') ? from : '/admin')
      router.refresh()
    } else {
      const data = await res.json().catch(() => ({}))
      setError(data.error || '로그인에 실패했습니다.')
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f8f9] px-4">
      <div className="w-full max-w-[360px] rounded-[16px] bg-white px-8 py-9 shadow-[0_1px_2px_rgba(15,27,46,0.04),0_3px_10px_rgba(15,27,46,0.05)]">
        {/* 로고 */}
        <div className="mb-7 flex items-center justify-center gap-2">
          <span className="font-score text-[19px] font-[400] tracking-[1px] text-[#1e3a5f]">
            체육교육회
          </span>
          <span className="rounded-full bg-[#1e3a5f] px-2 py-[2px] text-[10px] font-[500] tracking-[0.5px] text-white">
            Admin
          </span>
        </div>

        <form onSubmit={submit} className="space-y-3">
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="아이디"
            autoComplete="username"
            autoFocus
            className="admin-field w-full rounded-[10px] bg-[#f4f6f8] px-3.5 py-2.5 text-[14px] text-[#1f2937] outline-none transition-colors placeholder:text-[#b0b6be] focus:bg-[#eaeef2]"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            autoComplete="current-password"
            className="admin-field w-full rounded-[10px] bg-[#f4f6f8] px-3.5 py-2.5 text-[14px] text-[#1f2937] outline-none transition-colors placeholder:text-[#b0b6be] focus:bg-[#eaeef2]"
          />

          {error && <p className="text-[12.5px] font-[300] text-[#c0392b]">{error}</p>}

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="mt-1 w-full rounded-[10px] bg-[#1e3a5f] py-2.5 text-[14px] font-[500] text-white transition-opacity hover:opacity-90 disabled:opacity-40"
          >
            {loading ? '확인 중…' : '로그인'}
          </button>
        </form>
      </div>
    </div>
  )
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
