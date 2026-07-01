'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownRendererProps {
  content: string
  className?: string
}

// 나인브릿지 마크다운 렌더러 그대로 이식. site_contents 등 CMS 본문 렌더용(실데이터는 2b).
export default function MarkdownRenderer({ content, className = '' }: MarkdownRendererProps) {
  return (
    <div className={`prose prose-sm max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: (props) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img {...props} alt={props.alt ?? ''} className="max-w-full h-auto rounded-[8px] my-4" loading="lazy" />
          ),
          a: (props) => (
            <a {...props} className="text-[#3071a5] hover:underline" target="_blank" rel="noopener noreferrer" />
          ),
          h1: (props) => <h1 {...props} className="text-[24px] font-bold text-[#1f2937] mt-6 mb-3" />,
          h2: (props) => <h2 {...props} className="text-[20px] font-bold text-[#1f2937] mt-5 mb-2" />,
          h3: (props) => <h3 {...props} className="text-[18px] font-semibold text-[#1f2937] mt-4 mb-2" />,
          p: (props) => <p {...props} className="fluid-body text-[#374151] leading-relaxed mb-3" />,
          ul: (props) => <ul {...props} className="list-disc list-inside fluid-body text-[#374151] mb-3 space-y-1" />,
          ol: (props) => <ol {...props} className="list-decimal list-inside fluid-body text-[#374151] mb-3 space-y-1" />,
          code: ({ className, children, ...props }) => {
            const isInline = !className
            return isInline ? (
              <code className="bg-[#f3f4f6] px-1.5 py-0.5 rounded text-[13px] text-[#e11d48]" {...props}>
                {children}
              </code>
            ) : (
              <code className="block bg-[#1f2937] text-[#e5e7eb] p-4 rounded-[8px] text-[13px] overflow-x-auto" {...props}>
                {children}
              </code>
            )
          },
          blockquote: (props) => (
            <blockquote {...props} className="border-l-4 border-[#3071a5] pl-4 my-4 text-[#6b7280] italic" />
          ),
          hr: (props) => <hr {...props} className="border-[#e5e7eb] my-6" />,
          strong: (props) => <strong {...props} className="font-semibold text-[#1f2937]" />,
          em: (props) => <em {...props} className="italic" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
