import 'server-only'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { verifyMyToken } from '@/lib/serverCrypto'
import { loadLedger } from '@/lib/refundLedger'
import { buildPayConfirm, payConfirmBlock, PAY_CONFIRM_BLOCK_TEXT } from '@/lib/payConfirm'
import { PAY_CONFIRM_SEAL } from '@/lib/payConfirm/seal'

// 마이페이지 이체확인서 — 토큰 검증 + 소유권(phone+name) 확인 후 서버가 값을 계산해 반환.
// 금액은 환불 기록에서 새로 센 장부(loadLedger)로 계산한다. 직인은 이 응답에만 실어 보낸다. DB 쓰기 없음.
export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const schema = z.object({ token: z.string().min(1), applicationId: z.string().uuid() })

export async function POST(req: Request) {
  const parsed = schema.safeParse(await req.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: '잘못된 요청입니다.' }, { status: 400 })

  const claims = verifyMyToken(parsed.data.token, Date.now())
  if (!claims) return NextResponse.json({ error: '세션이 만료되었습니다. 다시 조회해 주세요.' }, { status: 401 })

  try {
    const { data, error } = await supabaseAdmin
      .from('applications')
      .select('id, application_no, applicant_name, payer_name, session:sessions(label, schedule_type, starts_on, ends_on), participants(id)')
      .eq('id', parsed.data.applicationId)
      .eq('phone', claims.phone)
      .eq('applicant_name', claims.name)
      .maybeSingle()
    if (error) throw error
    if (!data) return NextResponse.json({ error: '대상 신청 내역을 찾을 수 없습니다.' }, { status: 404 })

    type Row = {
      id: string
      application_no: string | null
      applicant_name: string
      payer_name: string | null
      session: { label: string | null; schedule_type: string; starts_on: string; ends_on: string } | null
      participants: { id: string }[] | null
    }
    const r = data as unknown as Row
    const ledger = await loadLedger(r.id)
    if (!ledger) return NextResponse.json({ error: '대상 신청 내역을 찾을 수 없습니다.' }, { status: 404 })

    const source = {
      scheduleType: r.session?.schedule_type ?? 'jikmu',
      status: ledger.status,
      sessionLabel: r.session?.label ?? null,
      startsOn: r.session?.starts_on ?? null,
      endsOn: r.session?.ends_on ?? null,
      applicationNo: r.application_no ?? '',
      applicantName: r.applicant_name,
      payerName: r.payer_name,
      headcount: r.participants?.length || 1,
      ledger,
    }
    const block = payConfirmBlock(source)
    if (block) return NextResponse.json({ error: PAY_CONFIRM_BLOCK_TEXT[block] }, { status: 409 })

    return NextResponse.json({ doc: buildPayConfirm(source, new Date()), seal: PAY_CONFIRM_SEAL })
  } catch (e) {
    console.error('[my/pay-confirm]', e)
    return NextResponse.json({ error: '조회 중 오류가 발생했습니다.' }, { status: 500 })
  }
}
