// 솔라피 REST v4 최소 클라이언트 — SDK 의존성 없이 알림톡 발송(send-many/detail)·조회(list)만.
// 알림톡(ATA)은 대체문자를 보내지 않는다(disableSms). 본문은 솔라피가 승인 템플릿 + variables 로 만든다.
// 인증: HMAC-SHA256(apiSecret, date+salt). 키·서명은 로그/오류 문자열에 넣지 않는다.
// 결과 분류: 4xx·접수실패 = 미발송 확정(rejected) / 5xx·네트워크·시간초과·해석 불가 = 불명확(unknown).
import { createHmac, randomBytes } from 'node:crypto'
import type { LookupOutcome, SendOutcome, SmsProvider } from './types'

const BASE = 'https://api.solapi.com'
const ALNUM = '1234567890abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ'

type FetchLike = (url: string, init: { method: string; headers: Record<string, string>; body?: string; signal?: AbortSignal }) =>
  Promise<{ status: number; text(): Promise<string> }>

export function authHeader(apiKey: string, apiSecret: string, now = new Date(), salt?: string): string {
  const date = now.toISOString().replace(/\.\d{3}Z$/, 'Z')
  const s = salt ?? Array.from(randomBytes(32), (b) => ALNUM[b % ALNUM.length]).join('')
  const signature = createHmac('sha256', apiSecret).update(date + s).digest('hex')
  return `HMAC-SHA256 apiKey=${apiKey}, date=${date}, salt=${s}, signature=${signature}`
}

const str = (v: unknown): string | null => (typeof v === 'string' && v ? v : null)

export function createSolapiProvider(opts: {
  apiKey: string
  apiSecret: string
  fetch?: FetchLike
  timeoutMs?: number
}): SmsProvider {
  const doFetch: FetchLike = opts.fetch ?? ((url, init) => fetch(url, init))
  const timeoutMs = opts.timeoutMs ?? 8000

  async function call(method: 'GET' | 'POST', path: string, body?: unknown) {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), timeoutMs)
    try {
      const res = await doFetch(`${BASE}${path}`, {
        method,
        headers: { Authorization: authHeader(opts.apiKey, opts.apiSecret), 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: ctrl.signal,
      })
      const raw = await res.text()
      let json: unknown = null
      try {
        json = raw ? JSON.parse(raw) : null
      } catch {
        json = null
      }
      return { status: res.status, json: json as Record<string, unknown> | null }
    } finally {
      clearTimeout(timer)
    }
  }

  return {
    async send({ to, from, pfId, templateId, variables, notificationId }): Promise<SendOutcome> {
      let r: { status: number; json: Record<string, unknown> | null }
      try {
        r = await call('POST', '/messages/v4/send-many/detail', {
          messages: [
            {
              to,
              ...(from ? { from } : {}),
              type: 'ATA',
              kakaoOptions: {
                pfId,
                templateId,
                variables: Object.fromEntries(Object.entries(variables).map(([k, v]) => [`#{${k}}`, v])),
                disableSms: true,
              },
              customFields: { notificationId },
            },
          ],
          showMessageList: true,
        })
      } catch (e) {
        const aborted = e instanceof Error && e.name === 'AbortError'
        return { kind: 'unknown', error: aborted ? 'timeout' : 'network_error' }
      }
      if (r.status >= 400 && r.status < 500 && r.status !== 408) {
        const code = str(r.json?.errorCode)
        return { kind: 'rejected', statusCode: code, statusMessage: str(r.json?.errorMessage), error: `http_${r.status}` }
      }
      if (r.status !== 200 || !r.json) return { kind: 'unknown', error: `http_${r.status}` }
      const failed = Array.isArray(r.json.failedMessageList) ? (r.json.failedMessageList as Record<string, unknown>[]) : null
      const list = Array.isArray(r.json.messageList) ? (r.json.messageList as Record<string, unknown>[]) : []
      const group = (r.json.groupInfo ?? null) as Record<string, unknown> | null
      if (failed && failed.length > 0) {
        return { kind: 'rejected', statusCode: str(failed[0].statusCode), statusMessage: str(failed[0].statusMessage), error: 'registration_failed' }
      }
      if (!failed || !group) return { kind: 'unknown', error: 'unexpected_response' }
      const item = list[0] ?? {}
      return {
        kind: 'accepted',
        messageId: str(item.messageId),
        groupId: str(group.groupId) ?? str(group._id),
        statusCode: str(item.statusCode),
        statusMessage: str(item.statusMessage),
      }
    },

    async lookup({ messageId, to, from, notificationId, since }): Promise<LookupOutcome> {
      const q = new URLSearchParams()
      if (messageId) q.set('messageId', messageId)
      else {
        q.set('to', to)
        if (from) q.set('from', from)
        q.set('dateType', 'CREATED')
        q.set('startDate', since)
        q.set('limit', '100')
      }
      let r: { status: number; json: Record<string, unknown> | null }
      try {
        r = await call('GET', `/messages/v4/list?${q.toString()}`)
      } catch (e) {
        return { kind: 'error', error: e instanceof Error && e.name === 'AbortError' ? 'timeout' : 'network_error' }
      }
      if (r.status !== 200 || !r.json) return { kind: 'error', error: `http_${r.status}` }
      const map = (r.json.messageList ?? {}) as Record<string, Record<string, unknown>>
      const items = Object.entries(map).map(([id, m]) => ({ id, m }))
      const hit = items.find(({ id, m }) =>
        messageId ? (str(m.messageId) ?? id) === messageId : (m.customFields as Record<string, unknown> | undefined)?.notificationId === notificationId,
      )
      if (!hit) {
        // 번호 기준 조회에서 식별값이 안 맞아도 같은 번호 발송 건이 있으면 미발송으로 단정하지 않는다.
        if (!messageId && items.length > 0) return { kind: 'ambiguous', count: items.length }
        return { kind: 'not_found' }
      }
      return {
        kind: 'found',
        messageId: str(hit.m.messageId) ?? hit.id,
        groupId: str(hit.m.groupId),
        statusCode: str(hit.m.statusCode),
        statusMessage: str(hit.m.reason) ?? str(hit.m.status),
      }
    },
  }
}
