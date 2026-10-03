// 입금기한 — 기준일(신청일, 예비 승인 건은 승인일)의 KST 날짜 + 14일 23:59:59 까지.
// 자동취소(app/api/cron/auto-cancel)와 안내 문구(#{입금기한})가 같은 계산을 쓴다. 순수 함수.

export const DEPOSIT_DAYS = 14
const KST_MS = 9 * 3600 * 1000
const DAY_MS = 86400 * 1000

// 해당 시각이 속한 KST 날짜의 00:00(KST)을 UTC epoch ms 로.
function kstDayStart(ms: number): number {
  const k = new Date(ms + KST_MS)
  return Date.UTC(k.getUTCFullYear(), k.getUTCMonth(), k.getUTCDate()) - KST_MS
}

// 입금기한(마지막 순간). 예: 10/3 14:00 KST 신청 → 10/17 23:59:59.999 KST.
export function depositDeadline(baseIso: string): Date {
  return new Date(kstDayStart(new Date(baseIso).getTime()) + (DEPOSIT_DAYS + 1) * DAY_MS - 1)
}

// 추가납부 기한 — 추가입금 안내일(KST 날짜) + 7일 23:59:59 까지. 예: 10/3 안내 → 10/10 23:59:59.999 KST.
// 기준은 안내(수정 반영) 시각 하나뿐이다. 문안에 찍힌 기한은 이력에 저장되고 재발송은 저장된 문안을 그대로 보내므로
// 재발송으로 기한이 늘어나지 않는다. 자동취소 대상 아님(최초납부 14일·자동취소 정책과 별개).
export const DUE_DAYS = 7
export function dueDeadline(noticeIso: string): Date {
  return new Date(kstDayStart(new Date(noticeIso).getTime()) + (DUE_DAYS + 1) * DAY_MS - 1)
}

export function isPastDeadline(baseIso: string, now: Date): boolean {
  return now.getTime() > depositDeadline(baseIso).getTime()
}

// 기준시각 < cutoff 이면 기한 경과. (오늘 KST 00:00 − 14일)
export function autoCancelCutoff(now: Date): Date {
  return new Date(kstDayStart(now.getTime()) - DEPOSIT_DAYS * DAY_MS)
}

// 기한 기준 시각 — 예비 승인 건은 승인 시각이 더 늦으면 그 시각.
export function deadlineBase(createdAt: string, waitlistReleasedAt: string | null): string {
  if (!waitlistReleasedAt) return createdAt
  return new Date(waitlistReleasedAt).getTime() > new Date(createdAt).getTime() ? waitlistReleasedAt : createdAt
}
