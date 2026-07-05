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

// 마이페이지 액션 — 환불신청 / 수정요청. 토큰으로 소유권 검증 후 접수(/api/my/requests).
export type MyRequestBody =
  | { token: string; applicationId: string; type: 'refund'; reason: string; refundAccount: string }
  | { token: string; applicationId: string; type: 'modification'; content: string }
  | { token: string; applicationId: string; type: 'payment'; payerName: string }

export async function submitMyRequest(body: MyRequestBody): Promise<void> {
  const res = await fetch('/api/my/requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!res.ok || !json.ok) throw new Error(json.error || '요청 처리 중 오류가 발생했습니다.')
}
