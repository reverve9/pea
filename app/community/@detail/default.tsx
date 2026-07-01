import { EmptyState } from '@/components/common/StateView'

// @detail 슬롯 기본값: 상세 미선택 상태.
// Extended(780)는 데스크탑 전용(hidden md:block)이라 모바일에선 자동으로 안 보인다 → 데스크탑 빈상태만.
export default function DetailDefault() {
  return (
    <div className="flex min-h-[300px] items-center justify-center">
      <EmptyState label="좌측에서 공지를 선택하세요." />
    </div>
  )
}
