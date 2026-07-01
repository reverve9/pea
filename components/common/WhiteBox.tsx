'use client'

import React, { ReactNode } from 'react'

interface WhiteBoxProps {
  children: ReactNode
  className?: string
}

// Extended 영역용 화이트박스. 스타일은 globals.css `.white-box` 토큰에 위임(원칙1).
export default function WhiteBox({ children, className = '' }: WhiteBoxProps) {
  return <div className={`white-box ${className}`}>{children}</div>
}
