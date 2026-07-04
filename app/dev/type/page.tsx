'use client'

import Text, { TextVariant, VARIANT } from '@/components/common/Text'

// 타입 스펙 페이지(개발 전용) — 통일된 Text 티어를 실제 폰트·cqi로 직관 확인.
// 여기서 "이 티어 이렇게" 지정 → components/common/Text.tsx 의 VARIANT 한 줄만 고치면
// 이 페이지 + 전 페이지가 일괄 반영(단일 진실원천). 배포 대상 아님(_dev).

type Row = { v: TextVariant; sample: string; note?: string }

const GROUPS: { title: string; rows: Row[] }[] = [
  {
    title: '페이지 헤더 (정체성 · 데스크탑 고정)',
    rows: [
      { v: 'page-eyebrow', sample: 'TRAINING COURSE' },
      { v: 'page-title', sample: '연수 안내' },
    ],
  },
  {
    title: '섹션',
    rows: [
      { v: 'section', sample: '연수 유형' },
      { v: 'section-rail', sample: '일정', note: '데스크탑 좌측 인덱스 전용' },
    ],
  },
  {
    title: '카드 · 항목 제목',
    rows: [
      { v: 'card-title', sample: '직무연수 (2박 3일)', note: '표준 — 모달 제목도 이 티어' },
      { v: 'card-title-sm', sample: '환불 규정이 어떻게 되나요?', note: '조밀 리스트(FAQ·공지·문의)' },
      { v: 'card-sub', sample: '3월 2주차 · 스키 3학점', note: '카드 부제/메타' },
    ],
  },
  {
    title: '라벨 · 본문 · 주석',
    rows: [
      { v: 'label', sample: '연수 대상' },
      { v: 'body', sample: '전임·기간제 체육교사 및 스포츠강사를 대상으로 진행합니다.' },
      { v: 'sub', sample: '리프트권 1일차 오후 ~ 3일차 오전 (야간권 포함)' },
      { v: 'caption', sample: '* 숙소 사정에 따라 배정이 달라질 수 있습니다.' },
    ],
  },
  {
    title: '날짜 · 수치',
    rows: [
      { v: 'date', sample: '2026.07.04' },
      { v: 'num', sample: '180,000원' },
      { v: 'num-lg', sample: '540,000원', note: '총 합계 강조' },
    ],
  },
  {
    title: '마크다운 헤딩',
    rows: [
      { v: 'md-h1', sample: '공지사항 제목' },
      { v: 'md-h2', sample: '중간 소제목' },
      { v: 'md-h3', sample: '작은 소제목' },
    ],
  },
]

function Sample({ v, sample }: { v: TextVariant; sample: string }) {
  const isTitle = v === 'page-title' || v === 'page-eyebrow'
  return (
    <Text variant={v} as={isTitle ? 'div' : 'p'} className="block">
      {sample}
    </Text>
  )
}

export default function TypeSpecPage() {
  return (
    <div className="mx-auto max-w-[980px] px-6 py-10">
      <header className="mb-8">
        <p className="font-score text-[13px] font-[300] tracking-[2px] text-[#9ca3af]">TYPE SPEC · 통일 티어</p>
        <h1 className="mt-1 font-score text-[24px] font-[500] text-[#1e3a5f]">타이포 티어 최종값</h1>
        <p className="mt-2 font-pretendard text-[13px] font-[300] leading-relaxed text-[#6b7280]">
          아래는 <code className="rounded bg-[#f3f4f6] px-1 text-[#e11d48]">components/common/Text.tsx</code> 의
          단일 정의입니다. 각 티어 = 정본(넓은) 폭 샘플 + 아래 점선 박스 = 모달 폭(≈300px) — 같은 티어가 컨테이너에
          비례해 축소됩니다. 바꾸고 싶은 티어를 지정해 주시면 정의 한 줄을 고쳐 전 페이지 일괄 반영합니다.
        </p>
      </header>

      <div className="space-y-8">
        {GROUPS.map((g) => (
          <section key={g.title}>
            <h2 className="mb-3 border-b border-[#e5e7eb] pb-2 font-score text-[12px] font-[500] uppercase tracking-[1.5px] text-[#6b7280]">
              {g.title}
            </h2>
            <div className="space-y-6">
              {g.rows.map((r) => (
                <div key={r.v}>
                  {/* 티어명 + 메모 */}
                  <div className="mb-1.5 flex items-baseline gap-2">
                    <code className="font-score text-[11px] font-[600] text-[#2f8ba0]">{r.v}</code>
                    {r.note && <span className="font-pretendard text-[11px] font-[300] text-[#b0b6be]">{r.note}</span>}
                  </div>
                  {/* 정본 폭(넓은) 샘플 */}
                  <div className="[container-type:inline-size]">
                    <Sample v={r.v} sample={r.sample} />
                  </div>
                  {/* 모달 폭 인셋(≈300px) — 같은 티어가 컨테이너 비례로 축소됨 */}
                  <div className="mt-2 w-[300px] max-w-full rounded-[10px] border border-dashed border-[#e5e7eb] bg-[#fafbfc] px-3 py-2 [container-type:inline-size]">
                    <span className="mb-1 block font-score text-[9.5px] font-[500] uppercase tracking-[1px] text-[#c4c9d0]">
                      모달 폭 ≈ 300
                    </span>
                    <Sample v={r.v} sample={r.sample} />
                  </div>
                  {/* 단일 정의값 */}
                  <p className="mt-1.5 font-pretendard text-[10.5px] font-[300] leading-snug text-[#c4c9d0]">
                    {VARIANT[r.v]}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
