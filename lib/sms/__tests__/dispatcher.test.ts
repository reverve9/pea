import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createDispatcher, type DispatchInput } from '../dispatcher'
import { readSmsConfig } from '../config'
import { LIVE, PHONE, memoryStore, mockProvider } from './helpers'
import type { SmsConfig } from '../types'

const input = (over: Partial<DispatchInput> = {}): DispatchInput => ({
  kind: 'deposit_initial',
  dedupeKey: 'deposit_initial:app-1',
  applicationId: 'app-1',
  refundRequestId: null,
  recipient: '010-1234-5678',
  message: { type: 'LMS', subject: '[체육교육회] 입금 확인 안내', text: '본문' },
  ...over,
})
const later = (ms: number) => () => new Date(Date.now() + ms)

test('정상 발송: 접수 → sent, 수신번호 숫자 정규화, 식별값 전달', async () => {
  const store = memoryStore()
  const { provider, calls } = mockProvider()
  const d = createDispatcher({ store, config: LIVE, provider })
  const r = await d.dispatch(input())
  assert.equal(r.outcome, 'sent')
  assert.equal(calls.send.length, 1)
  assert.equal(calls.send[0].to, PHONE)
  assert.equal(calls.send[0].from, LIVE.sender)
  assert.equal(calls.send[0].notificationId, store.rows[0].id)
  assert.equal(store.rows[0].attempts, 1)
  assert.equal(store.rows[0].provider_message_id, 'M1')
  assert.ok(store.rows[0].sent_at)
})

test('중복 방지: 같은 키 재요청(재클릭·재저장·되돌림 후 재처리)은 발송하지 않음', async () => {
  const store = memoryStore()
  const { provider, calls } = mockProvider()
  const d = createDispatcher({ store, config: LIVE, provider })
  await d.dispatch(input())
  const again = await Promise.all([d.dispatch(input()), d.dispatch(input())])
  assert.deepEqual(again.map((x) => x.outcome), ['duplicate', 'duplicate'])
  assert.equal(calls.send.length, 1)
  assert.equal(store.rows.length, 1)
})

test('동시 요청 2건도 1건만 발송', async () => {
  const store = memoryStore()
  const { provider, calls } = mockProvider()
  const d = createDispatcher({ store, config: LIVE, provider })
  const rs = await Promise.all([d.dispatch(input()), d.dispatch(input())])
  assert.equal(rs.filter((x) => x.outcome === 'sent').length, 1)
  assert.equal(calls.send.length, 1)
})

test('환불 건별 키 분리: 같은 신청의 여러 환불은 각각 발송', async () => {
  const store = memoryStore()
  const { provider, calls } = mockProvider()
  const d = createDispatcher({ store, config: LIVE, provider })
  await d.dispatch(input({ kind: 'refund_completed', dedupeKey: 'refund_completed:r1', refundRequestId: 'r1' }))
  await d.dispatch(input({ kind: 'refund_completed', dedupeKey: 'refund_completed:r2', refundRequestId: 'r2' }))
  await d.dispatch(input({ kind: 'refund_received', dedupeKey: 'refund_received:r1', refundRequestId: 'r1' }))
  assert.equal(calls.send.length, 3)
  assert.deepEqual(store.rows.map((r) => r.refund_request_id), ['r1', 'r2', 'r1'])
})

test('설정 없음 → held(미발송), 필요한 키 이름만 기록', async () => {
  const cfg = readSmsConfig({ SMS_ENABLED: 'true' })
  const store = memoryStore()
  const { provider, calls } = mockProvider()
  const d = createDispatcher({ store, config: cfg, provider: null })
  const r = await d.dispatch(input())
  assert.equal(r.outcome, 'held')
  assert.equal(calls.send.length, 0)
  assert.equal(store.rows[0].last_error, 'config_missing:SOLAPI_API_KEY,SOLAPI_API_SECRET,SOLAPI_SENDER')
  assert.equal(store.rows[0].attempts, 0)
  void provider
})

test('스위치 꺼짐·허용번호 밖 → held', async () => {
  const off: SmsConfig = { ...LIVE, enabled: false }
  const allow: SmsConfig = { ...LIVE, allowlist: ['01099998888'] }
  for (const [cfg, reason] of [[off, 'disabled'], [allow, 'not_in_allowlist']] as const) {
    const store = memoryStore()
    const { provider, calls } = mockProvider()
    const r = await createDispatcher({ store, config: cfg, provider }).dispatch(input())
    assert.equal(r.outcome, 'held')
    assert.equal(store.rows[0].last_error, reason)
    assert.equal(calls.send.length, 0)
  }
})

test('허용번호 안의 번호는 발송', async () => {
  const store = memoryStore()
  const { provider, calls } = mockProvider()
  const r = await createDispatcher({ store, config: { ...LIVE, allowlist: [PHONE] }, provider }).dispatch(input())
  assert.equal(r.outcome, 'sent')
  assert.equal(calls.send.length, 1)
})

test('수신번호 오류 → failed(미발송), 재발송 불가', async () => {
  const store = memoryStore()
  const { provider, calls } = mockProvider()
  const d = createDispatcher({ store, config: LIVE, provider })
  const r = await d.dispatch(input({ recipient: '02-123-4567' }))
  assert.equal(r.outcome, 'failed')
  assert.equal(store.rows[0].last_error, 'invalid_recipient')
  const rr = await d.resend(store.rows[0].id)
  assert.equal(rr.ok, false)
  assert.equal(calls.send.length, 0)
})

test('저장 실패(테이블 미적용 등) → 발송하지 않음, 예외 없음', async () => {
  const store = memoryStore()
  store.failInsert = 'PGRST205'
  const { provider, calls } = mockProvider()
  const r = await createDispatcher({ store, config: LIVE, provider }).dispatch(input())
  assert.equal(r.outcome, 'store_error')
  assert.equal(calls.send.length, 0)
})

test('발송 거절 → failed → 재발송 성공(같은 문안, 시도 2회)', async () => {
  const store = memoryStore()
  const { provider, calls } = mockProvider({ send: [{ kind: 'rejected', statusCode: '1062', statusMessage: '발신번호 미등록', error: 'registration_failed' }] })
  const d = createDispatcher({ store, config: LIVE, provider })
  const r = await d.dispatch(input())
  assert.equal(r.outcome, 'failed')
  const rr = await d.resend(store.rows[0].id)
  assert.equal(rr.ok, true)
  assert.equal(calls.send.length, 2)
  assert.equal(calls.send[1].message.text, '본문')
  assert.equal(store.rows[0].status, 'sent')
  assert.equal(store.rows[0].attempts, 2)
  assert.equal((await d.resend(store.rows[0].id)).ok, false) // 이미 발송
  assert.equal(calls.send.length, 2)
})

test('provider 예외 → unknown, 재발송 금지', async () => {
  const store = memoryStore()
  const { provider, calls } = mockProvider()
  provider.send = async () => {
    calls.send.push({} as never)
    throw new Error('boom')
  }
  const d = createDispatcher({ store, config: LIVE, provider })
  const r = await d.dispatch(input())
  assert.equal(r.outcome, 'unknown')
  const rr = await d.resend(store.rows[0].id)
  assert.equal(rr.ok, false)
  assert.equal(calls.send.length, 1)
})

test('불명확 → 조회: 유예 전엔 유지, 유예 후 미발견이면 failed → 재발송', async () => {
  const store = memoryStore()
  const { provider, calls } = mockProvider({ send: [{ kind: 'unknown', error: 'timeout' }] })
  await createDispatcher({ store, config: LIVE, provider }).dispatch(input())
  const id = store.rows[0].id
  const early = await createDispatcher({ store, config: LIVE, provider }).check(id)
  assert.equal(early.ok, false)
  assert.equal(store.rows[0].status, 'unknown')
  const d = createDispatcher({ store, config: LIVE, provider, now: later(11 * 60_000) })
  const c = await d.check(id)
  assert.equal(c.ok, true)
  assert.equal(store.rows[0].status, 'failed')
  assert.equal(calls.lookup[1].messageId, null)
  assert.equal(calls.lookup[1].notificationId, id)
  assert.equal((await d.resend(id)).ok, true)
  assert.equal(calls.send.length, 2)
})

test('불명확 → 조회에서 발견되면 sent(재발송 없음)', async () => {
  const store = memoryStore()
  const { provider, calls } = mockProvider({
    send: [{ kind: 'unknown', error: 'timeout' }],
    lookup: [{ kind: 'found', messageId: 'MX', groupId: 'GX', statusCode: '4000', statusMessage: '수신완료' }],
  })
  const d = createDispatcher({ store, config: LIVE, provider })
  await d.dispatch(input())
  const c = await d.check(store.rows[0].id)
  assert.equal(c.ok, true)
  assert.equal(store.rows[0].status, 'sent')
  assert.equal(store.rows[0].provider_message_id, 'MX')
  assert.equal(calls.send.length, 1)
})

test('불명확 → 같은 번호 다른 건만 있으면 자동 판정하지 않음', async () => {
  const store = memoryStore()
  const { provider } = mockProvider({ send: [{ kind: 'unknown', error: 'timeout' }], lookup: [{ kind: 'ambiguous', count: 2 }] })
  const d = createDispatcher({ store, config: LIVE, provider, now: later(11 * 60_000) })
  await d.dispatch(input())
  const c = await d.check(store.rows[0].id)
  assert.equal(c.ok, false)
  assert.equal(store.rows[0].status, 'unknown')
})

test('발송된 건 조회에서 전달 실패 코드 → failed(재발송 가능)', async () => {
  const store = memoryStore()
  const { provider } = mockProvider({ lookup: [{ kind: 'found', messageId: 'M1', groupId: 'G1', statusCode: '3059', statusMessage: '번호 없음' }] })
  const d = createDispatcher({ store, config: LIVE, provider })
  await d.dispatch(input())
  await d.check(store.rows[0].id)
  assert.equal(store.rows[0].status, 'failed')
  assert.equal(store.rows[0].last_error, 'delivery_failed:3059')
})

test('관리자 수동 판정: unknown → 미발송 확인 → 재발송 / sent 는 판정 불가', async () => {
  const store = memoryStore()
  const { provider, calls } = mockProvider({ send: [{ kind: 'unknown', error: 'network_error' }] })
  const d = createDispatcher({ store, config: LIVE, provider })
  await d.dispatch(input())
  const id = store.rows[0].id
  assert.equal((await d.markResolved(id, 'failed')).ok, true)
  assert.equal((await d.resend(id)).ok, true)
  assert.equal((await d.markResolved(id, 'failed')).ok, false)
  assert.equal(calls.send.length, 2)
})

test('오래된 sending(중단된 시도)은 조회·수동판정 대상, 최근 sending 은 아님', async () => {
  const store = memoryStore()
  const { provider } = mockProvider()
  const d0 = createDispatcher({ store, config: LIVE, provider })
  await d0.dispatch(input())
  Object.assign(store.rows[0], { status: 'sending', provider_message_id: null })
  assert.equal((await d0.markResolved(store.rows[0].id, 'sent')).ok, false)
  const d = createDispatcher({ store, config: LIVE, provider, now: later(3 * 60_000) })
  assert.equal((await d.markResolved(store.rows[0].id, 'sent')).ok, true)
  assert.equal(store.rows[0].status, 'sent')
})

test('동시 재발송 클릭 → 1건만 외부 호출', async () => {
  const store = memoryStore()
  const { provider, calls } = mockProvider({ send: [{ kind: 'rejected', statusCode: null, statusMessage: null, error: 'http_400' }] })
  const d = createDispatcher({ store, config: LIVE, provider })
  await d.dispatch(input())
  const rs = await Promise.all([d.resend(store.rows[0].id), d.resend(store.rows[0].id)])
  assert.equal(rs.filter((x) => x.ok).length, 1)
  assert.equal(calls.send.length, 2)
})

test('늦게 도착한 이전 시도 결과는 새 시도 상태를 덮지 않음', async () => {
  const store = memoryStore()
  const d = createDispatcher({ store, config: LIVE, provider: mockProvider().provider })
  await d.dispatch(input())
  const row = store.rows[0]
  Object.assign(row, { status: 'sending', attempts: 3 })
  const stale = await store.update(row.id, { status: ['sending'], attempts: 2 }, { status: 'failed' })
  assert.equal(stale, null)
  assert.equal(row.status, 'sending')
})

test('held 재발송: 설정이 여전히 없으면 안내만, 설정 후 발송', async () => {
  const store = memoryStore()
  const { provider, calls } = mockProvider()
  await createDispatcher({ store, config: { ...LIVE, enabled: false }, provider }).dispatch(input())
  const off = await createDispatcher({ store, config: readSmsConfig({}), provider: null }).resend(store.rows[0].id)
  assert.equal(off.ok, false)
  assert.match((off as { error: string }).error, /SOLAPI_API_KEY/)
  const on = await createDispatcher({ store, config: LIVE, provider }).resend(store.rows[0].id)
  assert.equal(on.ok, true)
  assert.equal(calls.send.length, 1)
})
