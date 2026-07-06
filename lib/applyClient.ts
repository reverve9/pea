// 폼 → 제출 파이프라인(/api/applications) 호출 헬퍼. 클라 전용(fetch).
import type { ApplyPayload, ApplyResult, MyParticipantInput, MyRosterParticipant, RosterSummary } from './applicationTypes'

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

// 마이페이지 참가자 로스터 조회 — 대표 대신 동반인 후속입력용. 뒷자리 미포함.
export async function fetchMyRoster(token: string, applicationId: string): Promise<MyRosterParticipant[]> {
  const res = await fetch('/api/my/roster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, applicationId }),
  })
  const json = (await res.json().catch(() => ({}))) as { roster?: MyRosterParticipant[]; error?: string }
  if (!res.ok || !json.roster) throw new Error(json.error || '참가자 정보를 불러오지 못했습니다.')
  return json.roster
}

// 참가자 후속입력 저장 — 대표가 동반인 정보를 대신 입력. 토큰 소유권 검증은 서버(/api/my/participant).
export async function submitMyParticipant(
  token: string,
  applicationId: string,
  participantId: string,
  input: MyParticipantInput,
): Promise<void> {
  const res = await fetch('/api/my/participant', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, applicationId, participantId, ...input }),
  })
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!res.ok || !json.ok) throw new Error(json.error || '저장 중 오류가 발생했습니다.')
}

// 셀프필 링크 발급(마이) — 대표가 참가자별로 각자에게 공유할 개별 링크 토큰. 전체 URL 은 호출부가 origin 을 붙인다.
export async function requestMyFillLink(
  token: string,
  applicationId: string,
  participantId: string,
): Promise<string> {
  const res = await fetch('/api/my/fill-link', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, applicationId, participantId }),
  })
  const json = (await res.json().catch(() => ({}))) as { fillToken?: string; error?: string }
  if (!res.ok || !json.fillToken) throw new Error(json.error || '링크 생성에 실패했습니다.')
  return json.fillToken
}

// 셀프필 공개페이지 — 링크 토큰만으로 로스터 조회(마이 세션 불필요).
export async function fetchFillRoster(token: string): Promise<{ roster: MyRosterParticipant[]; summary: RosterSummary }> {
  const res = await fetch('/api/fill/roster', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token }),
  })
  const json = (await res.json().catch(() => ({}))) as { roster?: MyRosterParticipant[]; summary?: RosterSummary; error?: string }
  if (!res.ok || !json.roster || !json.summary) throw new Error(json.error || '참가자 정보를 불러오지 못했습니다.')
  return { roster: json.roster, summary: json.summary }
}

// 셀프필 저장 — 동반인이 링크로 본인 정보 입력. 서버가 링크 토큰→신청소속 검증.
export async function submitFillParticipant(token: string, participantId: string, input: MyParticipantInput): Promise<void> {
  const res = await fetch('/api/fill', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, participantId, ...input }),
  })
  const json = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string }
  if (!res.ok || !json.ok) throw new Error(json.error || '저장 중 오류가 발생했습니다.')
}
