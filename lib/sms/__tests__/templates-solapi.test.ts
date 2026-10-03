import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import {
  depositInitialMessage,
  depositAdditionalMessage,
  refundReceivedMessage,
  refundCompletedMessage,
  kstDate,
  smsBytes,
  type SmsAppInfo,
} from '../templates'
import { authHeader, createSolapiProvider } from '../solapi'
import { readSmsConfig } from '../config'

const APP: SmsAppInfo = {
  applicationNo: 'SJ-2701-0007',
  applicantName: '홍길동',
  programLabel: '스키·스노보드 직무연수 · 1차',
  period: '2027/01/11 – 01/13 (2박)',
  isWaitlisted: false,
}

test('입금확인: 금액·신청내역·참가 확정, 예비는 확정 안내 안 함', () => {
  const m = depositInitialMessage({ app: APP, amount: 350000, myUrl: 'https://x.kr/my' })
  assert.equal(m.type, 'LMS')
  assert.match(m.text, /입금이 확인되었습니다/)
  assert.match(m.text, /확인금액: 350,000원/)
  assert.match(m.text, /SJ-2701-0007/)
  assert.match(m.text, /참가가 확정되었습니다/)
  const w = depositInitialMessage({ app: { ...APP, isWaitlisted: true }, amount: 1, myUrl: null })
  assert.doesNotMatch(w.text, /확정되었습니다/)
  assert.doesNotMatch(w.text, /신청 조회/)
})

test('추가입금: 최초 입금확인과 구분', () => {
  const m = depositAdditionalMessage({ app: APP, amount: 20000, total: 370000, myUrl: null })
  assert.match(m.subject ?? '', /추가 입금 확인/)
  assert.match(m.text, /추가 확인금액: 20,000원/)
  assert.match(m.text, /총 결제금액: 370,000원/)
})

test('환불접수: 완료 아님 명시, 요청금액과 최종금액 구분, 처리기간 미안내', () => {
  const u = refundReceivedMessage({ app: APP, origin: 'user', requestedAmount: null, receivedAt: '2026-10-03T15:30:00Z', myUrl: null })
  assert.match(u.text, /환불 요청이 접수되었습니다/)
  assert.match(u.text, /아직 환불이 완료된 것은 아니며/)
  assert.match(u.text, /담당자 확인 후 산정/)
  assert.match(u.text, /최종 환불금액은 담당자 확인 후 확정/)
  assert.match(u.text, /접수일: 2026\.10\.04/) // KST 날짜
  assert.doesNotMatch(u.text, /환불이 완료되었습니다|영업일|예정일/)
  const p = refundReceivedMessage({ app: APP, origin: 'modification', requestedAmount: 15000, receivedAt: '2026-10-03T00:00:00Z', myUrl: null })
  assert.match(p.text, /부분환불/)
  assert.match(p.text, /요청금액: 15,000원/)
})

test('환불완료: 실제 금액·처리일·전체/부분, 계좌정보 없음', () => {
  const f = refundCompletedMessage({ app: APP, amount: 350000, full: true, completedAt: '2026-10-05T01:00:00Z', receivedAt: '2026-10-03T00:00:00Z', myUrl: null })
  assert.match(f.text, /환불이 완료되었습니다/)
  assert.match(f.text, /구분: 전체환불/)
  assert.match(f.text, /환불금액: 350,000원/)
  assert.match(f.text, /처리일: 2026\.10\.05/)
  assert.match(f.text, /환불 접수일: 2026\.10\.03/)
  assert.doesNotMatch(f.text, /계좌/)
  const p = refundCompletedMessage({ app: APP, amount: 15000, full: false, completedAt: '2026-10-05T01:00:00Z', receivedAt: null, myUrl: null })
  assert.match(p.text, /구분: 부분환불/)
  assert.doesNotMatch(p.text, /접수일/)
})

test('바이트 계산·SMS/LMS 판정·LMS 2000바이트 이내', () => {
  assert.equal(smsBytes('ab가'), 4)
  assert.equal(kstDate('2026-10-03T14:59:59Z'), '2026.10.03')
  assert.equal(kstDate('2026-10-03T15:00:00Z'), '2026.10.04')
  const long = refundReceivedMessage({ app: { ...APP, applicantName: '가'.repeat(20) }, origin: 'user', requestedAmount: null, receivedAt: '2026-10-03T00:00:00Z', myUrl: 'https://example.com/my' })
  assert.ok(smsBytes(long.text) < 2000)
  assert.ok(smsBytes(long.subject ?? '') <= 40)
})

test('설정 읽기: 키 이름만, 발신번호 숫자 정규화, 허용번호', () => {
  const c = readSmsConfig({ SMS_ENABLED: 'TRUE', SOLAPI_API_KEY: 'k', SOLAPI_API_SECRET: 's', SOLAPI_SENDER: '070-1234-5678', SMS_TEST_ALLOWLIST: '010-1111-2222, 01033334444' })
  assert.equal(c.enabled, true)
  assert.equal(c.sender, '07012345678')
  assert.deepEqual(c.allowlist, ['01011112222', '01033334444'])
  assert.deepEqual(c.missing, [])
  assert.equal(readSmsConfig({}).enabled, false)
})

test('인증 헤더: HMAC-SHA256(secret, date+salt)', () => {
  const now = new Date('2026-10-03T01:02:03.456Z')
  const h = authHeader('KEY', 'SECRET', now, 'saltsaltsalt')
  const sig = createHmac('sha256', 'SECRET').update('2026-10-03T01:02:03Zsaltsaltsalt').digest('hex')
  assert.equal(h, `HMAC-SHA256 apiKey=KEY, date=2026-10-03T01:02:03Z, salt=saltsaltsalt, signature=${sig}`)
  assert.match(authHeader('K', 'S'), /salt=[0-9A-Za-z]{32}, /)
})

type Call = { url: string; method: string; headers: Record<string, string>; body?: string }
function fakeFetch(res: { status: number; body: unknown } | Error) {
  const calls: Call[] = []
  const fn = async (url: string, init: { method: string; headers: Record<string, string>; body?: string }) => {
    calls.push({ url, ...init })
    if (res instanceof Error) throw res
    return { status: res.status, text: async () => (typeof res.body === 'string' ? res.body : JSON.stringify(res.body)) }
  }
  return { fn, calls }
}
const MSG = { type: 'LMS' as const, subject: '제목', text: '본문' }

test('솔라피 발송: 요청 형식·접수 응답 해석', async () => {
  const f = fakeFetch({
    status: 200,
    body: { failedMessageList: [], groupInfo: { groupId: 'G1', count: {} }, messageList: [{ messageId: 'M1', statusCode: '2000', statusMessage: '정상 접수' }] },
  })
  const p = createSolapiProvider({ apiKey: 'K', apiSecret: 'S', fetch: f.fn })
  const r = await p.send({ to: '01012345678', from: '0700000000', message: MSG, notificationId: 'n1' })
  assert.deepEqual(r, { kind: 'accepted', messageId: 'M1', groupId: 'G1', statusCode: '2000', statusMessage: '정상 접수' })
  assert.equal(f.calls[0].url, 'https://api.solapi.com/messages/v4/send-many/detail')
  assert.equal(f.calls[0].method, 'POST')
  const body = JSON.parse(f.calls[0].body ?? '{}')
  assert.deepEqual(body.messages[0], { to: '01012345678', from: '0700000000', type: 'LMS', text: '본문', subject: '제목', customFields: { notificationId: 'n1' } })
  assert.match(f.calls[0].headers.Authorization, /^HMAC-SHA256 apiKey=K, /)
  assert.doesNotMatch(JSON.stringify(f.calls[0]), /apiSecret|"S"/)
})

test('솔라피 발송: 접수 실패·4xx = rejected / 5xx·네트워크·시간초과·이상응답 = unknown', async () => {
  const cases: [{ status: number; body: unknown } | Error, string][] = [
    [{ status: 200, body: { failedMessageList: [{ statusCode: '1062', statusMessage: '발신번호 미등록' }], groupInfo: { groupId: 'G' }, messageList: [] } }, 'rejected'],
    [{ status: 403, body: { errorCode: 'NotEnoughBalance', errorMessage: '잔액 부족' } }, 'rejected'],
    [{ status: 401, body: { errorCode: 'InvalidAPIKey' } }, 'rejected'],
    [{ status: 500, body: {} }, 'unknown'],
    [{ status: 408, body: {} }, 'unknown'],
    [{ status: 200, body: 'not json' }, 'unknown'],
    [{ status: 200, body: { ok: true } }, 'unknown'],
    [Object.assign(new Error('aborted'), { name: 'AbortError' }), 'unknown'],
    [new Error('ECONNRESET'), 'unknown'],
  ]
  for (const [res, kind] of cases) {
    const p = createSolapiProvider({ apiKey: 'K', apiSecret: 'S', fetch: fakeFetch(res).fn })
    const r = await p.send({ to: '01012345678', from: '0700000000', message: MSG, notificationId: 'n1' })
    assert.equal(r.kind, kind, JSON.stringify(res instanceof Error ? res.message : res))
  }
})

test('솔라피 조회: messageId 조회 / 번호 조회 시 식별값 일치·불일치·없음', async () => {
  const byId = fakeFetch({ status: 200, body: { messageList: { M1: { messageId: 'M1', groupId: 'G1', statusCode: '4000', reason: '수신완료' } } } })
  const p1 = createSolapiProvider({ apiKey: 'K', apiSecret: 'S', fetch: byId.fn })
  const r1 = await p1.lookup({ messageId: 'M1', to: 't', from: 'f', notificationId: 'n1', since: '2026-10-03T00:00:00Z' })
  assert.equal(r1.kind, 'found')
  assert.match(byId.calls[0].url, /\/messages\/v4\/list\?messageId=M1$/)
  assert.equal(byId.calls[0].method, 'GET')

  const list = { messageList: { A: { messageId: 'A', customFields: { notificationId: 'other' } }, B: { messageId: 'B', customFields: { notificationId: 'n1' }, statusCode: '2000' } } }
  const hit = await createSolapiProvider({ apiKey: 'K', apiSecret: 'S', fetch: fakeFetch({ status: 200, body: list }).fn })
    .lookup({ messageId: null, to: 't', from: 'f', notificationId: 'n1', since: 's' })
  assert.deepEqual(hit.kind === 'found' && hit.messageId, 'B')
  const amb = await createSolapiProvider({ apiKey: 'K', apiSecret: 'S', fetch: fakeFetch({ status: 200, body: list }).fn })
    .lookup({ messageId: null, to: 't', from: 'f', notificationId: 'zz', since: 's' })
  assert.equal(amb.kind, 'ambiguous')
  const none = await createSolapiProvider({ apiKey: 'K', apiSecret: 'S', fetch: fakeFetch({ status: 200, body: { messageList: {} } }).fn })
    .lookup({ messageId: null, to: 't', from: 'f', notificationId: 'n1', since: 's' })
  assert.equal(none.kind, 'not_found')
  const err = await createSolapiProvider({ apiKey: 'K', apiSecret: 'S', fetch: fakeFetch({ status: 500, body: {} }).fn })
    .lookup({ messageId: 'M1', to: 't', from: 'f', notificationId: 'n1', since: 's' })
  assert.equal(err.kind, 'error')
})
