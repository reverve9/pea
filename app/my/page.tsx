'use client'

import { useEffect, useState } from 'react'
import { ShieldCheck, Smartphone, FileText, RefreshCcw, Pencil } from 'lucide-react'
import AppShell from '@/components/layout/AppShell'
import PageTitle from '@/components/common/PageTitle'
import SectionTitle from '@/components/common/SectionTitle'
import WhiteBox from '@/components/common/WhiteBox'
import Text from '@/components/common/Text'
import { Button } from '@/components/common/Button'
import { Badge, type BadgeColor } from '@/components/common/Badge'
import { MasterDetailProvider, MasterDetailList, MasterDetailDetail } from '@/components/shell/MasterDetail'
import { useQuery } from '@/lib/useQuery'
import { getSiteContent } from '@/lib/queries'
import type { SiteContent } from '@/lib/types'

// §3-4 마이페이지 — 전화 조회 게이트 → 신청목록 마스터-디테일(셸 패턴2). [[jayul-apply-form-spec]]
// 골격 단계: 레이아웃·선택상태·상태배지·빈/상세 구조만. 실제 조회(getApplicationsByPhone)·OTP 인증·
// 수정/환불/증명서 액션은 제출 파이프라인(Task 5) 배선 후. 아래 MOCK 은 레이아웃 확인용 임시.

type ApplicationStatus = 'pending' | 'paid' | 'completed' | 'cancelled' | 'refunded'
const STATUS: Record<ApplicationStatus, { label: string; color: BadgeColor }> = {
  pending: { label: '입금 대기', color: 'amber' },
  paid: { label: '입금 확인', color: 'navy' },
  completed: { label: '연수 완료', color: 'emerald' },
  cancelled: { label: '취소', color: 'slate' },
  refunded: { label: '환불 완료', color: 'slate' },
}

interface MyApplication {
  id: string
  application_no: string
  track_label: string // 직무연수 / 자율패키지 · 주말 2박
  period: string
  applicant_name: string
  headcount: number
  total_amount: number
  status: ApplicationStatus
  created_at: string
}

// ⚠ 임시 목데이터 — 제출 파이프라인(Task 5) + getApplicationsByPhone 배선 시 제거하고 실데이터로 교체.
const MOCK: MyApplication[] = [
  { id: '1', application_no: 'PEA-2027-0042', track_label: '직무연수', period: '2027.01.20 – 01.22 (2박3일)', applicant_name: '홍길동', headcount: 1, total_amount: 303000, status: 'paid', created_at: '2026.12.18' },
  { id: '2', application_no: 'PEA-2027-0117', track_label: '자율패키지 · 주말 2박', period: '2027.01.15 – 01.17 (2박3일)', applicant_name: '홍길동', headcount: 4, total_amount: 1156000, status: 'pending', created_at: '2026.12.20' },
]

const won = (n: number) => n.toLocaleString('ko-KR') + '원'

// 본인확인(방식 b, SMS 없음) — 게이트에서 이름+전화+생년월일(이미 수집한 값, 본인이 항상 아는 값) 입력 →
// Task5에서 /api 가 매칭·검증하고 opaque 세션토큰 발급. localStorage 엔 원문 PII 대신 세션(토큰+표시이름)만
// 저장해 같은 기기 재방문 시 자동 조회. 다른 기기 = 이름+전화+생년월일 재입력(분실 없음). [[application-plan-reference]]
interface Auth {
  name: string
  phone: string
  birth: string // YYMMDD (신청폼 birthFront 와 매칭)
}
interface Session {
  name: string
  token: string
}
const SESSION_KEY = 'pea:my:auth'

// 조회 게이트 — 이름 + 전화번호 + 신청번호로 본인확인(계획안 ④). SMS 없이 localStorage 기억.
function AuthGate({ onVerified }: { onVerified: (v: Auth) => void }) {
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [birth, setBirth] = useState('')
  const ok = name.trim().length > 0 && phone.length >= 10 && birth.length === 6
  // 통일 규칙: 포커스에 하드 테두리 안 씀. 테두리 고정(#e5eaef), 포커스는 옅은 배경 틴트로만.
  const inputCls =
    'w-full rounded-[10px] border border-[#e5eaef] bg-white px-3.5 py-2.5 text-center font-score text-[16px] text-[#1f2937] placeholder:text-[#b6bcc4] transition-colors focus:bg-[#f7f9fb] focus:outline-none'
  return (
    <div className="pb-8">
      <PageTitle title="마이페이지" en="MY" />
      <section className="px-4">
        <WhiteBox className="p-6 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#eef2f7]">
            <ShieldCheck size={26} className="text-[#1e3a5f]" />
          </div>
          <Text variant="card-title" as="h3">본인 확인</Text>
          <Text variant="sub" as="p" className="mt-2 text-[#6b7280]">신청 시 사용한 이름 · 휴대폰 번호 · 생년월일로<br />내 신청 내역을 조회합니다.</Text>
          <input className={`${inputCls} mt-5`} value={name} onChange={(e) => setName(e.target.value)} placeholder="이름" />
          <input
            className={`${inputCls} mt-2`}
            value={phone}
            onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 11))}
            placeholder="01000000000 (- 없이 숫자만)"
            inputMode="numeric"
          />
          <input
            className={`${inputCls} mt-2`}
            value={birth}
            onChange={(e) => setBirth(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="생년월일 6자리 (YYMMDD)"
            inputMode="numeric"
          />
          <Button size="md" variant="primary" disabled={!ok} onClick={() => onVerified({ name: name.trim(), phone, birth })} className="mt-3 w-full">
            <Smartphone size={15} className="mr-1.5" />
            조회하기
          </Button>
        </WhiteBox>
      </section>
    </div>
  )
}

// 신청 카드(마스터) — 버튼 래핑은 MasterDetailList 가 처리, 여기선 시각만.
function ApplicationCard(app: MyApplication, selected: boolean) {
  const st = STATUS[app.status]
  return (
    <WhiteBox className={`p-4 transition-shadow ${selected ? 'ring-2 ring-[#1e3a5f]/30' : ''}`}>
      <div className="flex items-center justify-between gap-2">
        <Text variant="caption" className="tabular-nums text-[#8a94a0]">{app.application_no}</Text>
        <Badge color={st.color} size="sm">{st.label}</Badge>
      </div>
      <Text variant="card-title" as="p" className="mt-1.5">{app.track_label}</Text>
      <Text variant="sub" as="p" className="mt-0.5 text-[#4b5563]">{app.period}</Text>
      <div className="mt-2 flex items-center justify-between border-t border-[#eef1f4] pt-2">
        <Text variant="caption" className="text-[#9ca3af]">{app.headcount}인 · {app.created_at} 신청</Text>
        <Text variant="num">{won(app.total_amount)}</Text>
      </div>
    </WhiteBox>
  )
}

// 신청 상세(디테일) — 데스크탑 우측 페인 / 모바일 모달 공용. refundBody = site_contents refund_policy(어드민 편집).
function ApplicationDetail(app: MyApplication, refundBody: string | null) {
  const st = STATUS[app.status]
  const rows: [string, string][] = [
    ['신청자', app.applicant_name],
    ['일정', app.period],
    ['인원', `${app.headcount}명`],
    ['신청일', app.created_at],
  ]
  return (
    <div>
      <div className="flex items-center justify-between gap-2">
        <Text variant="card-title" as="h3">{app.track_label}</Text>
        <Badge color={st.color}>{st.label}</Badge>
      </div>
      <Text variant="caption" as="p" className="mt-1 tabular-nums text-[#8a94a0]">{app.application_no}</Text>

      <dl className="mt-4 space-y-2.5">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3">
            <Text variant="sub" className="shrink-0 text-[#9ca3af]">{k}</Text>
            <Text variant="sub" className="text-right text-[#374151]">{v}</Text>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 border-t border-[#e5eaef] pt-2.5">
          <Text variant="card-title-sm">결제 금액</Text>
          <Text variant="num-lg">{won(app.total_amount)}</Text>
        </div>
      </dl>

      {/* 참가자 명단·상세 내역은 제출 파이프라인 배선 후 표시 */}
      <div className="mt-4 rounded-[10px] border border-dashed border-[#d7dde5] bg-[#f7f9fb] px-4 py-5 text-center">
        <Text variant="sub" color="#9ca3af">참가자 명단·상세 내역은 준비 중입니다.</Text>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <Button variant="outline" size="sm" disabled><Pencil size={13} className="mr-1" />수정요청</Button>
        <Button variant="outline" size="sm" disabled><RefreshCcw size={13} className="mr-1" />환불신청</Button>
        <Button variant="outline" size="sm" disabled><FileText size={13} className="mr-1" />증명서</Button>
      </div>
      <Text variant="caption" as="p" className="mt-2 text-center text-[#b6bcc4]">수정·환불·증명서 기능은 준비 중입니다.</Text>

      {/* 환불 규정 — site_contents(refund_policy) 실데이터. 환불신청 맥락에서 노출. */}
      <div className="mt-4 rounded-[10px] border border-[#e5eaef] bg-[#f7f9fb] p-4">
        <Text variant="label" className="text-[#374151]">환불 규정</Text>
        {refundBody ? (
          <div className="mt-1.5 space-y-1">
            {refundBody.split('/').map((line, i) => (
              <Text key={i} variant="sub" as="p" className="text-[#4b5563]">· {line.trim()}</Text>
            ))}
          </div>
        ) : (
          <Text variant="sub" as="p" className="mt-1.5 text-[#9ca3af]">환불 규정을 불러오는 중…</Text>
        )}
        <Text variant="caption" as="p" className="mt-2 text-[#9ca3af]">기준일은 연수 시작일이며, 자세한 사항은 1:1 문의 바랍니다.</Text>
      </div>
    </div>
  )
}

export default function MyPage() {
  const [session, setSession] = useState<Session | null>(null)
  const refund = useQuery<SiteContent | null>(() => getSiteContent('refund_policy'), null)
  const refundBody = refund.data?.body ?? null

  // 같은 기기 재방문 시 localStorage 세션(토큰) 복원 → 자동 조회. 원문 PII 는 저장하지 않음.
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(SESSION_KEY)
      if (raw) setSession(JSON.parse(raw) as Session)
    } catch {
      /* 손상된 값 무시 */
    }
  }, [])

  // 게이트 제출 — 실제로는 creds(이름+전화+신청번호)를 /api 로 보내 서버가 매칭·검증 후 opaque 토큰 발급(Task5).
  // 토큰은 사용자가 볼/기억할 값이 아니며, 사용자가 보관할 크리덴셜은 '신청번호'. 여기선 미리보기 세션.
  const verify = (creds: Auth) => {
    const s: Session = { name: creds.name, token: 'preview' } // TODO(Task5): 서버 발급 opaque 토큰으로 교체
    setSession(s)
    try {
      window.localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    } catch {
      /* 저장 실패 무시 */
    }
  }
  const clearSession = () => {
    setSession(null)
    try {
      window.localStorage.removeItem(SESSION_KEY)
    } catch {
      /* 무시 */
    }
  }

  // 1) 조회 게이트
  if (!session) {
    return (
      <AppShell
        main={<AuthGate onVerified={verify} />}
        extended={
          <div>
            <SectionTitle title="마이페이지 안내" />
            <WhiteBox className="p-6">
              <Text variant="body" className="text-[#4b5563]">본인 확인 후 신청 내역 조회 · 정보 수정요청 · 환불 신청 · 증명서 발급을 이용할 수 있습니다.</Text>
            </WhiteBox>
          </div>
        }
      />
    )
  }

  // 2) 신청목록 마스터-디테일. TODO: getApplicationsByPhone(phone) 배선 — 현재는 목데이터.
  const apps = MOCK

  return (
    <MasterDetailProvider>
      <AppShell
        main={
          <div className="pb-8">
            <PageTitle title="마이페이지" en="MY" />
            <div className="flex items-center justify-between gap-2 px-4 pb-1">
              <Text variant="sub" className="text-[#6b7280]">{session.name} 님의 신청 내역 {apps.length}건</Text>
              <button type="button" onClick={clearSession} className="shrink-0 font-score text-[12px] text-[#9ca3af] underline underline-offset-2">다른 정보로 조회</button>
            </div>
            <MasterDetailList
              items={apps}
              getKey={(a) => a.id}
              renderCard={(a, { selected }) => ApplicationCard(a, selected)}
              emptyLabel="조회된 신청 내역이 없습니다."
            />
            <MasterDetailDetail items={apps} getKey={(a) => a.id} renderDetail={(a) => ApplicationDetail(a, refundBody)} variant="mobile" />
          </div>
        }
        extended={
          <div>
            <SectionTitle title="신청 상세" />
            <WhiteBox className="p-6">
              <MasterDetailDetail items={apps} getKey={(a) => a.id} renderDetail={(a) => ApplicationDetail(a, refundBody)} variant="desktop" />
            </WhiteBox>
          </div>
        }
      />
    </MasterDetailProvider>
  )
}
