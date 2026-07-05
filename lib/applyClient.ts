// 폼 → 제출 파이프라인(/api/applications) 호출 헬퍼. 클라 전용(fetch).
import type { ApplyPayload, ApplyResult } from './applicationTypes'

export async function submitApplication(payload: ApplyPayload): Promise<ApplyResult> {
  const res = await fetch('/api/applications', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })
  const json = (await res.json().catch(() => ({}))) as Partial<ApplyResult> & { error?: string }
  if (!res.ok || !json.application_no) throw new Error(json.error || '신청 처리 중 오류가 발생했습니다.')
  return { application_no: json.application_no }
}
