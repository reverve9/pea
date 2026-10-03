// 시험용 메모리 저장소·모의 솔라피 — DB 고유 제약/조건부 갱신과 같은 규칙.
import type { LookupOutcome, SendOutcome, SmsConfig, SmsLog, SmsProvider, SmsStore } from '../types'

export function memoryStore(): SmsStore & { rows: SmsLog[]; failInsert?: string } {
  const rows: SmsLog[] = []
  let seq = 0
  const store = {
    rows,
    failInsert: undefined as string | undefined,
    async insert(row: Parameters<SmsStore['insert']>[0]) {
      if (store.failInsert) return { kind: 'error' as const, error: store.failInsert }
      if (rows.some((r) => r.dedupe_key === row.dedupe_key)) return { kind: 'duplicate' as const }
      const t = new Date().toISOString()
      const full: SmsLog = {
        id: `sms-${++seq}`,
        provider_message_id: null,
        provider_group_id: null,
        provider_status_code: null,
        provider_status_message: null,
        sent_at: null,
        created_at: t,
        updated_at: t,
        ...row,
      }
      rows.push(full)
      return { kind: 'inserted' as const, row: { ...full } }
    },
    async get(id: string) {
      const r = rows.find((x) => x.id === id)
      return r ? { ...r } : null
    },
    async update(id: string, expect: { status: SmsLog['status'][]; attempts: number }, patch: Partial<SmsLog>) {
      const r = rows.find((x) => x.id === id)
      if (!r || !expect.status.includes(r.status) || r.attempts !== expect.attempts) return null
      Object.assign(r, patch, { updated_at: new Date().toISOString() })
      return { ...r }
    },
  }
  return store
}

export function mockProvider(script: { send?: SendOutcome[]; lookup?: LookupOutcome[] } = {}) {
  const calls = { send: [] as Parameters<SmsProvider['send']>[0][], lookup: [] as Parameters<SmsProvider['lookup']>[0][] }
  const send = [...(script.send ?? [])]
  const lookup = [...(script.lookup ?? [])]
  const provider: SmsProvider = {
    async send(input) {
      calls.send.push(input)
      return send.shift() ?? { kind: 'accepted', messageId: `M${calls.send.length}`, groupId: 'G1', statusCode: '2000', statusMessage: '정상 접수' }
    },
    async lookup(input) {
      calls.lookup.push(input)
      return lookup.shift() ?? { kind: 'not_found' }
    },
  }
  return { provider, calls }
}

export const LIVE: SmsConfig = {
  enabled: true,
  apiKey: 'k',
  apiSecret: 's',
  sender: '0700000000',
  allowlist: null,
  missing: [],
}

export const PHONE = '01012345678'
