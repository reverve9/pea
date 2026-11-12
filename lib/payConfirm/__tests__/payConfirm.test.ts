import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildPayConfirm, formatDay, issuedText, payConfirmBlock, payConfirmStatusBlock, programName, type PayConfirmSource } from '../index'

const src = (over: Partial<PayConfirmSource> = {}): PayConfirmSource => ({
  scheduleType: 'jikmu',
  status: 'paid',
  sessionLabel: '직무 2차수',
  startsOn: '2026-01-11',
  endsOn: '2026-01-13',
  applicantName: '노승환',
  payerName: null,
  headcount: 1,
  ledger: { total_amount: 405000, due_amount: 0, refunded_amount: 0, mod_refund_amount: 0 },
  ...over,
})
const NOW = new Date('2026-01-14T03:00:00Z') // KST 2026-01-14 12:00

test('양식 예시와 같은 값', () => {
  const d = buildPayConfirm(src(), NOW)
  assert.equal(d.programName, '직무연수')
  assert.equal(d.period, '2026. 01. 11. (일) ~ 2026. 01. 13. (화)')
  assert.equal(d.place, '알펜시아 리조트')
  assert.equal(d.amountText, '405,000원')
  assert.equal(d.payerName, '노승환')
  assert.equal(d.method, '은행 계좌이체')
  assert.equal(d.issuedText, '2026년 1월 14일')
  assert.equal(d.note, '')
})

test('요일 계산', () => {
  assert.equal(formatDay('2026-01-11'), '2026. 01. 11. (일)')
  assert.equal(formatDay('2026-12-31'), '2026. 12. 31. (목)')
})

test('발급일은 한국 날짜 기준(UTC 15시 이후는 다음 날)', () => {
  assert.equal(issuedText(new Date('2026-01-13T14:59:00Z')), '2026년 1월 13일')
  assert.equal(issuedText(new Date('2026-01-13T15:00:00Z')), '2026년 1월 14일')
})

test('회차명 변환', () => {
  assert.equal(programName('jikmu', '직무 1차수'), '직무연수')
  assert.equal(programName('jikmu', null), '직무연수')
  assert.equal(programName('weekend_2n', '주말2박 1차수'), '자율패키지_주말2박_1차수')
  assert.equal(programName('weekday_2n', '주중2박 2차수'), '자율패키지_주중2박_2차수')
  assert.equal(programName('weekend_1n', '주말 1박 3차'), '자율패키지_주말1박_3차수')
  assert.equal(programName('weekend_2n', '설날 특별반'), '자율패키지_설날_특별반')
})

test('입금자명: 신고 입금자명 우선, 없으면 신청자명', () => {
  assert.equal(buildPayConfirm(src({ payerName: '노승환(부)' }), NOW).payerName, '노승환(부)')
  assert.equal(buildPayConfirm(src({ payerName: '  ' }), NOW).payerName, '노승환')
})

test('특이사항: 직무는 인원 표기 안 함, 환불만', () => {
  const d = buildPayConfirm(src({ headcount: 2, ledger: { total_amount: 405000, due_amount: 0, refunded_amount: 50000, mod_refund_amount: 0 } }), NOW)
  assert.equal(d.amount, 355000)
  assert.equal(d.note, '환불 50,000원 반영 (입금 405,000원)')
  assert.equal(buildPayConfirm(src({ headcount: 3 }), NOW).note, '')
})

test('특이사항: 자율패키지 인원·환불', () => {
  const d = buildPayConfirm(
    src({ scheduleType: 'weekend_2n', sessionLabel: '주말2박 1차수', headcount: 2, ledger: { total_amount: 700000, due_amount: 0, refunded_amount: 100000, mod_refund_amount: 50000 } }),
    NOW,
  )
  // 받은 돈 = 700,000 + 수정 감액 50,000 = 750,000 / 순납부 = 650,000
  assert.equal(d.amount, 650000)
  assert.equal(d.note, '참가 인원 2명 · 환불 100,000원 반영 (입금 750,000원)')
  assert.equal(buildPayConfirm(src({ scheduleType: 'weekend_2n', sessionLabel: '주말2박 1차수', headcount: 1 }), NOW).note, '')
})

test('발급 조건', () => {
  assert.equal(payConfirmBlock(src()), null)
  assert.equal(payConfirmBlock(src({ status: 'completed' })), null)
  assert.equal(payConfirmBlock(src({ scheduleType: 'weekend_2n', sessionLabel: '주말2박 1차수' })), null)
  assert.equal(payConfirmBlock(src({ status: 'pending' })), 'status')
  assert.equal(payConfirmBlock(src({ status: 'cancelled' })), 'status')
  assert.equal(payConfirmBlock(src({ status: 'refunded' })), 'status')
  assert.equal(payConfirmBlock(src({ ledger: { total_amount: 500000, due_amount: 95000, refunded_amount: 0, mod_refund_amount: 0 } })), 'due')
  assert.equal(payConfirmBlock(src({ ledger: { total_amount: 405000, due_amount: 0, refunded_amount: 405000, mod_refund_amount: 0 } })), 'amount')
  assert.equal(payConfirmBlock(src({ startsOn: null })), 'session')
  assert.equal(payConfirmStatusBlock({ status: 'paid', due_amount: 0 }), null)
})
