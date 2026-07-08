import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'

// 현금영수증 발급 엔진 — 어드민 서버액션(입금확인·추가입금·환불)에서 호출.
// 발급 수단 = 대행 API(팝빌 등) 전제. ⚠ 실 API 콜은 미연동(구조만) — issueViaPopbill/cancelViaPopbill 스텁.
//   지금은 원장(cash_receipts)에 pending 으로만 남긴다(어드민이 홈택스 병행 발급 후 승인번호 수기입력 가능).
// 원칙:
//   · 의무발행(site_settings.cash_receipt_mandatory=true, 기본)이면 항상 발급 — 개인/사업자/자진(010-000-1234) 중 하나.
//     "발급 안 함"도 진짜 미발급 금지 → 자진발급으로 흘려 20% 가산세 차단. (프론트 우회 불가하게 서버에서만 판정.)
//   · 비의무로 완화(false)되면 '발급 안 함'은 실제 미발급 허용.
//   · 발급 실패가 입금확인 자체를 막지 않도록 모든 함수는 예외를 삼키고 결과만 반환(호출측 best-effort).

const SELF_ISSUE_ID = '0100001234' // 국세청 지정번호 010-000-1234 (자진발급)

type Purpose = 'personal' | 'business' | 'self'

// 의무발행 여부 — 기본 true(설정 없으면 발급). 'false' 로 명시된 경우만 완화.
async function isMandatory(): Promise<boolean> {
  const { data } = await supabaseAdmin
    .from('site_settings').select('value').eq('key', 'cash_receipt_mandatory').maybeSingle()
  return (data?.value ?? 'true') !== 'false'
}

// 발급 대상 식별 — 신청의 발급의도(type/bizno/phone)로 목적·식별번호 결정 + 자진발급 폴백.
// 사업자번호/휴대폰이 유효하지 않으면 자진발급(self)으로 흐른다.
function resolveTarget(app: {
  cash_receipt_type: string | null
  cash_receipt_bizno: string | null
  phone: string | null
}): { purpose: Purpose; identifier: string } {
  const type = app.cash_receipt_type ?? 'none'
  const bizno = (app.cash_receipt_bizno ?? '').replace(/\D/g, '')
  const phone = (app.phone ?? '').replace(/\D/g, '')
  if (type === 'business' && bizno.length === 10) return { purpose: 'business', identifier: bizno }
  if (type === 'personal' && phone.length >= 10) return { purpose: 'personal', identifier: phone }
  return { purpose: 'self', identifier: SELF_ISSUE_ID } // none/미선택/식별번호 누락 → 자진발급
}

// 팝빌 발급 API 스텁 — 실연동 시 여기서 국세청 발급 요청 → 승인번호 회수.
// TODO(cash-receipt): 팝빌/링크허브 발급 API 연동. 현재는 미연동(pending 원장만, 승인번호 없음).
async function issueViaPopbill(
  args: { purpose: Purpose; identifier: string; amount: number },
): Promise<{ status: 'pending' | 'issued' | 'failed'; approvalNo: string | null; raw: Record<string, unknown> }> {
  return { status: 'pending', approvalNo: null, raw: { stub: true, request: args } }
}

export type CashReceiptResult = { ok: true; skipped?: boolean } | { ok: false; error: string }

// 발급 — 입금확인(status→paid)·추가입금 확인 시 호출. amount = 이번에 확정된 입금액(면세 총액).
export async function issueCashReceipt(applicationId: string, amount: number): Promise<CashReceiptResult> {
  try {
    if (!Number.isInteger(amount) || amount <= 0) return { ok: true, skipped: true }
    const { data: app, error } = await supabaseAdmin
      .from('applications')
      .select('cash_receipt_type, cash_receipt_bizno, phone')
      .eq('id', applicationId)
      .maybeSingle()
    if (error) throw error
    if (!app) return { ok: false, error: '신청을 찾을 수 없습니다.' }

    // 비의무 + '발급 안 함' → 실제 미발급 허용. 그 외(의무이거나 유형 선택됨)는 항상 발급.
    if ((app.cash_receipt_type ?? 'none') === 'none' && !(await isMandatory())) {
      return { ok: true, skipped: true }
    }
    const target = resolveTarget(app)
    const res = await issueViaPopbill({ ...target, amount })
    const { error: insErr } = await supabaseAdmin.from('cash_receipts').insert({
      application_id: applicationId,
      kind: 'issue',
      purpose: target.purpose,
      identifier: target.identifier,
      amount,
      status: res.status,
      approval_no: res.approvalNo,
      raw: res.raw,
      issued_at: res.status === 'issued' ? new Date().toISOString() : null,
    })
    if (insErr) throw insErr
    return { ok: true }
  } catch (e) {
    console.error('[cashReceipt] issue:', e)
    return { ok: false, error: '현금영수증 발급 처리에 실패했습니다.' }
  }
}

// 취소발급 — 환불(전액/부분) 시 호출. amount = 이번 취소(환불)액. 가장 최근 원 발급건을 참조.
// 부분환불이면 부분취소(amount 만큼). 발급 이력이 없으면(비의무·미발급) 조용히 건너뛴다.
// TODO(cash-receipt): 팝빌 취소발급 API(원 승인번호 참조). 현재는 pending 취소원장만.
export async function cancelCashReceipt(applicationId: string, amount: number): Promise<CashReceiptResult> {
  try {
    if (!Number.isInteger(amount) || amount <= 0) return { ok: true, skipped: true }
    const { data: origin, error } = await supabaseAdmin
      .from('cash_receipts')
      .select('id, purpose, identifier')
      .eq('application_id', applicationId)
      .eq('kind', 'issue')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!origin) return { ok: true, skipped: true } // 발급 이력 없음 → 취소할 것 없음

    const { error: insErr } = await supabaseAdmin.from('cash_receipts').insert({
      application_id: applicationId,
      kind: 'cancel',
      ref_receipt_id: origin.id,
      purpose: origin.purpose,
      identifier: origin.identifier,
      amount,
      status: 'pending',
      raw: { stub: true },
    })
    if (insErr) throw insErr
    return { ok: true }
  } catch (e) {
    console.error('[cashReceipt] cancel:', e)
    return { ok: false, error: '현금영수증 취소발급 처리에 실패했습니다.' }
  }
}
