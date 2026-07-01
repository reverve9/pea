'use client'

import React from 'react'
import { Loader } from 'lucide-react'

interface MaintenanceProps {
  size?: 'small' | 'large'
}

// "준비중" 상태 표시. 나인브릿지 그대로(styled-jsx 는 Next 기본 포함).
export default function Maintenance({ size = 'small' }: MaintenanceProps) {
  const isLarge = size === 'large'
  return (
    <>
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fade {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
      <div className="flex flex-col items-center justify-center h-full min-h-[calc(100vh-200px)]">
        <div
          className={`${isLarge ? 'w-[160px] h-[160px]' : 'w-[120px] h-[120px]'} rounded-full bg-[#9ca3af]/20 flex items-center justify-center`}
        >
          <Loader
            className={`${isLarge ? 'w-[70px] h-[70px]' : 'w-[50px] h-[50px]'} text-[#9ca3af]`}
            style={{ animation: 'spin 3s linear infinite, fade 2s ease-in-out infinite' }}
          />
        </div>
        <p className={`${isLarge ? 'text-[20px]' : 'text-[16px]'} text-[#9ca3af] mt-8`}>
          Coming soon...
        </p>
      </div>
    </>
  )
}
