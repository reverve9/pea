import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createHmac } from 'node:crypto'
import { SMS_TEMPLATES, renderSms, fmtAmount, fmtAccount, fmtSchedule, kstDate, smsBytes, type SmsVars } from '../templates'
import type { SmsKind } from '../types'
import { authHeader, createSolapiProvider } from '../solapi'
import { readSmsConfig } from '../config'

// 샘플값 — 실제 신청 아님(합성).
export const SAMPLE_COMMON: SmsVars = {
  신청자명: '홍길동',
  신청번호: 'SJ-27-00007',
  신청차수: '직무 1차수',
  일정: fmtSchedule('2027-01-11', '2027-01-13', 2),
}
export const SAMPLE: Record<SmsKind, SmsVars> = {
  deposit_notice: { 결제금액: fmtAmount(350000), 계좌정보: fmtAccount({ bank: '국민은행', account: '123456-01-234567', holder: '체육교육회' }), 입금기한: kstDate('2026-10-17T14:59:59Z'), 입금자명: '홍길동' },
  waitlist_notice: {},
  deposit_initial: { 확인금액: fmtAmount(350000), 참가상태: '확정' },
  due_notice: { 추가금액: fmtAmount(20000), 계좌정보: fmtAccount({ bank: '국민은행', account: '123456-01-234567', holder: '체육교육회' }), 총결제금액: fmtAmount(370000), 입금기한: '2026.10.24' },
  deposit_additional: { 추가금액: fmtAmount(20000), 총결제금액: fmtAmount(370000) },
  refund_received: { 환불구분: '전체', 요청금액: fmtAmount(350000), 접수일: kstDate('2026-10-03T15:30:00Z') },
  refund_completed: { 환불구분: '부분', 환불금액: fmtAmount(15000), 처리일: kstDate('2026-10-05T01:00:00Z') },
  auto_cancelled: { 취소일: kstDate('2026-10-18T15:10:00Z'), 취소사유: '입금기한 경과' },
  event_reminder: { 공지URL: 'https://www.pea2025.co.kr/community/notices/00000000-0000-0000-0000-000000000001' },
}
const KINDS = Object.keys(SMS_TEMPLATES) as SmsKind[]

test('문안 9종: 샘플값 전부 치환 · 미치환 변수 없음 · 금액 단위 중복 없음 · LMS 범위', () => {
  assert.equal(KINDS.length, 9)
  for (const k of KINDS) {
    const { message, missing } = renderSms(k, { ...SAMPLE_COMMON, ...SAMPLE[k] })
    assert.deepEqual(missing, [], k)
    assert.doesNotMatch(message.text, /#\{/, `${k} 미치환`)
    assert.doesNotMatch(message.text, /원원|,원|\d원원/, `${k} 금액 단위 중복`)
    assert.match(message.text, /^안녕하세요\. 체육교육회입니다\./, k)
    assert.match(message.text, /문의: 홈페이지 ‘1:1 문의’\nwww\.pea2025\.co\.kr\n\n감사합니다\.$/, k)
    assert.equal(message.type, 'LMS', k)
    assert.ok(smsBytes(message.text) < 2000, k)
    assert.ok(smsBytes(message.subject ?? '') <= 40, k)
  }
})

test('문안 변수명이 정의와 정확히 일치(본문 토큰 = 필수 변수)', () => {
  const expected: Record<SmsKind, string[]> = {
    deposit_notice: ['결제금액', '계좌정보', '입금기한', '입금자명'],
    waitlist_notice: [],
    deposit_initial: ['확인금액', '참가상태'],
    due_notice: ['추가금액', '계좌정보', '총결제금액', '입금기한'],
    deposit_additional: ['추가금액', '총결제금액'],
    refund_received: ['환불구분', '요청금액', '접수일'],
    refund_completed: ['환불구분', '환불금액', '처리일'],
    auto_cancelled: ['취소일', '취소사유'],
    event_reminder: ['공지URL'],
  }
  for (const k of KINDS) {
    const tokens = [...new Set([...SMS_TEMPLATES[k].body.matchAll(/#\{([^}]+)\}/g)].map((m) => m[1]))]
    assert.deepEqual(tokens.sort(), ['신청자명', '신청번호', '신청차수', '일정', ...expected[k]].sort(), k)
    assert.deepEqual([...SMS_TEMPLATES[k].vars].sort(), tokens.sort(), k)
  }
})

test('치환 결과 예시: 금액 쉼표+원, 날짜 YYYY.MM.DD, 일정 기간, 계좌 3요소', () => {
  const t = renderSms('deposit_notice', { ...SAMPLE_COMMON, ...SAMPLE.deposit_notice }).message.text
  assert.match(t, /참가비: 350,000원\n/)
  assert.match(t, /일정: 2027\.01\.11 ~ 2027\.01\.13 \(2박\)\n/)
  assert.match(t, /계좌정보: 국민은행 123456-01-234567 \(예금주: 체육교육회\)\n/)
  assert.match(t, /입금기한: 2026\.10\.17\n/)
  assert.match(t, /입금자명: 홍길동\n/)
  const r = renderSms('refund_received', { ...SAMPLE_COMMON, ...SAMPLE.refund_received }).message.text
  assert.match(r, /접수일: 2026\.10\.04\n/) // KST
})

test('예비접수 안내: 금액·계좌·입금기한 없음, 편입 후 입금안내 예정 명시', () => {
  const t = renderSms('waitlist_notice', SAMPLE_COMMON).message.text
  assert.match(t, /참가 신청이 예비로 접수되었습니다/)
  assert.match(t, /추후 정원 편입이 확정되면 입금안내를 보내드리겠습니다/)
  assert.doesNotMatch(t, /원\n|계좌|입금기한|참가비/)
})

test('필수 변수 누락 → missing 목록, 해당 자리는 #{이름} 그대로', () => {
  const { message, missing } = renderSms('deposit_notice', { ...SAMPLE_COMMON, ...SAMPLE.deposit_notice, 계좌정보: null, 입금기한: '  ' })
  assert.deepEqual(missing, ['계좌정보', '입금기한'])
  assert.match(message.text, /계좌정보: #\{계좌정보\}/)
  assert.deepEqual(renderSms('event_reminder', { ...SAMPLE_COMMON }).missing, ['공지URL'])
  assert.deepEqual(renderSms('deposit_initial', {}).missing, ['신청자명', '신청번호', '신청차수', '일정', '확인금액', '참가상태'])
})

test('값 서식: 금액·계좌 자리표시 판정·일정·날짜', () => {
  assert.equal(fmtAmount(1234567), '1,234,567')
  assert.equal(fmtAmount(0), '0')
  assert.equal(fmtAmount(null), null)
  assert.equal(fmtAmount(-1), null)
  assert.equal(fmtAccount({ bank: '국민은행', account: '000000-00-000000', holder: '체육교육회' }), null) // 현재 사이트 자리표시 계좌
  assert.equal(fmtAccount({ bank: '국민은행', account: '123-45', holder: '' }), null)
  assert.equal(fmtSchedule('2027-01-15', '2027-01-15', 0), '2027.01.15')
  assert.equal(fmtSchedule(null, '2027-01-15', 1), null)
  assert.equal(smsBytes('ab가'), 4)
  assert.equal(kstDate('2026-10-03T14:59:59Z'), '2026.10.03')
  assert.equal(kstDate('2026-10-03T15:00:00Z'), '2026.10.04')
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
