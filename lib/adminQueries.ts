import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'
import { getSessionOccupancy } from './capacity'
import { formatPeriod, SCHEDULE_TYPE } from './display'
import type {
  NoticeAdmin,
  FaqAdmin,
  InquiryAdmin,
  ApplicationAdmin,
  ParticipantAdmin,
  ApplicationStatus,
  ScheduleType,
  SessionAdmin,
  CourseOption,
  RefundRequestAdmin,
  RefundStatus,
  ModificationRequestAdmin,
  ModificationStatus,
  CertificateRosterRow,
  PriceItemAdmin,
  SessionPriceOverride,
} from './types'

// 요청 join 공통 — application 은 SET NULL 이라 null 가능. 배열/객체 어느 형태든 정규화.
type JoinedApp = { application_no: string; applicant_name: string } | { application_no: string; applicant_name: string }[] | null
function pickApp(a: JoinedApp): { application_no: string | null; applicant_name: string | null } {
  const app = Array.isArray(a) ? a[0] : a
  return { application_no: app?.application_no ?? null, applicant_name: app?.applicant_name ?? null }
}

// 어드민 전체 조회 — service_role 이라 RLS 우회(미공개 공지·비밀 문의 원문 포함).
// 페이지(서버 컴포넌트)에서만 호출. 실패 시 빈 배열로 정규화(페이지 안 깨짐).

// 공지 전체(미공개 포함). 고정 먼저, 그다음 최신순.
export async function getAllNotices(): Promise<NoticeAdmin[]> {
  const { data, error } = await supabaseAdmin
    .from('notices')
    .select('id, title, content, category, is_pinned, is_published, published_at, created_at, updated_at')
    .order('is_pinned', { ascending: false })
    .order('created_at', { ascending: false })
  if (error) console.warn('[adminQueries] getAllNotices:', error)
  return (data as NoticeAdmin[]) ?? []
}

// FAQ 전체(미공개 포함). 정렬 순서 → 최신순.
export async function getAllFaqs(): Promise<FaqAdmin[]> {
  const { data, error } = await supabaseAdmin
    .from('faqs')
    .select('id, question, content, sort_order, is_published, updated_at')
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false })
  if (error) console.warn('[adminQueries] getAllFaqs:', error)
  return (data as FaqAdmin[]) ?? []
}

// 문의 전체(비밀글 원문·연락처 포함). 최신순.
export async function getAllInquiries(): Promise<InquiryAdmin[]> {
  const { data, error } = await supabaseAdmin
    .from('inquiries')
    .select('id, phone, name, title, content, is_secret, status, admin_reply, created_at, updated_at')
    .order('created_at', { ascending: false })
  if (error) console.warn('[adminQueries] getAllInquiries:', error)
  return (data as InquiryAdmin[]) ?? []
}

// 신청 전체 — 세션(→과정)·참가자 조인. 뒷자리 원문은 실어보내지 않고 has_insurance 플래그만.
// 정렬: 입금완료 신고 대기(pending+claimed)를 최상단으로, 그다음 최신순.
export async function getAllApplications(): Promise<ApplicationAdmin[]> {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(
      'id, application_no, applicant_name, phone, payer_name, room_type, room_spec, pkg_size, total_amount, status, is_waitlisted, payment_claimed_at, payment_claim_name, companion_memo, special_notes, referral_source, marketing_opt_in, admin_memo, created_at, session:sessions(label, schedule_type, starts_on, ends_on, nights, course:courses(sport)), participants(id, name, gender, phone, lesson_level, rentals, birth_front, birth_back_enc, is_leader, line_amount, sort_order)',
    )
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[adminQueries] getAllApplications:', error)
    return []
  }

  type PartRow = {
    id: string
    name: string
    gender: 'male' | 'female' | null
    phone: string | null
    lesson_level: string | null
    rentals: Record<string, unknown> | null
    birth_front: string | null
    birth_back_enc: string | null
    is_leader: boolean
    line_amount: number
    sort_order: number
  }
  type Row = {
    id: string
    application_no: string
    applicant_name: string
    phone: string
    payer_name: string | null
    room_type: 'group' | 'private' | null
    room_spec: string | null
    pkg_size: number | null
    total_amount: number
    status: ApplicationStatus
    is_waitlisted: boolean
    payment_claimed_at: string | null
    payment_claim_name: string | null
    companion_memo: string | null
    special_notes: string | null
    referral_source: string[] | null
    marketing_opt_in: boolean
    admin_memo: string | null
    created_at: string
    session:
      | {
          label: string
          schedule_type: ScheduleType
          starts_on: string
          ends_on: string
          nights: number
          course: { sport: string } | { sport: string }[] | null
        }
      | null
    participants: PartRow[] | null
  }

  const rows: ApplicationAdmin[] = ((data as unknown as Row[]) ?? []).map((r) => {
    const st = r.session?.schedule_type ?? 'jikmu'
    const isJikmu = st === 'jikmu'
    const courseRaw = r.session?.course
    const course = Array.isArray(courseRaw) ? courseRaw[0] : courseRaw
    const participants: ParticipantAdmin[] = (r.participants ?? [])
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => ({
        id: p.id,
        name: p.name,
        gender: p.gender,
        phone: p.phone,
        lesson_level: p.lesson_level,
        rentals: p.rentals ?? {},
        birth_front: p.birth_front,
        has_insurance: p.birth_back_enc != null,
        is_leader: p.is_leader,
        line_amount: p.line_amount,
      }))
    const claimed = r.payment_claimed_at != null
    return {
      id: r.id,
      application_no: r.application_no,
      applicant_name: r.applicant_name,
      phone: r.phone,
      payer_name: r.payer_name,
      kind: isJikmu ? 'jikmu' : 'jayul',
      program_sport: course?.sport ?? null,
      track_label: isJikmu ? '직무연수' : `자율패키지 · ${SCHEDULE_TYPE[st].label}`,
      session_label: r.session?.label ?? '',
      period: r.session ? formatPeriod(r.session.starts_on, r.session.ends_on, r.session.nights) : '',
      room_type: r.room_type,
      room_spec: r.room_spec,
      pkg_size: r.pkg_size,
      total_amount: r.total_amount,
      status: r.status,
      is_waitlisted: r.is_waitlisted ?? false,
      payment_claimed_at: r.payment_claimed_at,
      payment_claim_name: r.payment_claim_name,
      companion_memo: r.companion_memo,
      special_notes: r.special_notes,
      referral_source: r.referral_source ?? [],
      marketing_opt_in: r.marketing_opt_in,
      admin_memo: r.admin_memo,
      created_at: r.created_at,
      participants,
      headcount: participants.length || 1,
      needs_review: r.status === 'pending' && claimed,
      payer_mismatch:
        claimed && r.payment_claim_name != null && r.payment_claim_name.trim() !== r.applicant_name.trim(),
    }
  })

  // 입금완료 신고 대기 건을 최상단으로(created_at desc 는 이미 적용됨)
  return rows.sort((a, b) => Number(b.needs_review) - Number(a.needs_review))
}

// 환불 요청 전체 — 연결 신청(번호·신청자명) 조인. 최신순.
export async function getAllRefundRequests(): Promise<RefundRequestAdmin[]> {
  const { data, error } = await supabaseAdmin
    .from('refund_requests')
    .select('id, phone, reason, refund_account, status, admin_memo, created_at, application:applications(application_no, applicant_name)')
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[adminQueries] getAllRefundRequests:', error)
    return []
  }
  type Row = {
    id: string
    phone: string
    reason: string | null
    refund_account: string | null
    status: RefundStatus
    admin_memo: string | null
    created_at: string
    application: JoinedApp
  }
  return ((data as unknown as Row[]) ?? []).map((r) => ({
    id: r.id,
    ...pickApp(r.application),
    phone: r.phone,
    reason: r.reason,
    refund_account: r.refund_account,
    status: r.status,
    admin_memo: r.admin_memo,
    created_at: r.created_at,
  }))
}

// 수정 요청 전체 — 연결 신청 조인. 비밀글 원문 포함. 최신순.
export async function getAllModificationRequests(): Promise<ModificationRequestAdmin[]> {
  const { data, error } = await supabaseAdmin
    .from('modification_requests')
    .select('id, phone, content, is_secret, status, admin_reply, created_at, application:applications(application_no, applicant_name)')
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[adminQueries] getAllModificationRequests:', error)
    return []
  }
  type Row = {
    id: string
    phone: string
    content: string | null
    is_secret: boolean
    status: ModificationStatus
    admin_reply: string | null
    created_at: string
    application: JoinedApp
  }
  return ((data as unknown as Row[]) ?? []).map((r) => ({
    id: r.id,
    ...pickApp(r.application),
    phone: r.phone,
    content: r.content,
    is_secret: r.is_secret,
    status: r.status,
    admin_reply: r.admin_reply,
    created_at: r.created_at,
  }))
}

// 증명서 발급현황 — 연수완료(status='completed') 신청의 참가자 명단 × 수료증 발급 원장.
// 참가자 1행 = 발급 대상. certificate_requests(cert_type='completion') 존재 여부로 발급/대기 판정.
// ⚠ seed 09(certificate_requests.participant_id) 실행 후 동작.
export async function getCertificateRoster(): Promise<CertificateRosterRow[]> {
  const { data, error } = await supabaseAdmin
    .from('applications')
    .select(
      'id, application_no, applicant_name, phone, session:sessions(schedule_type, label, starts_on, ends_on, nights), participants(id, name, is_leader, sort_order, certificate_requests(id, cert_type, status, created_at))',
    )
    .eq('status', 'completed')
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[adminQueries] getCertificateRoster:', error)
    return []
  }

  type Cert = { id: string; cert_type: string; status: string; created_at: string }
  type Part = { id: string; name: string; is_leader: boolean; sort_order: number; certificate_requests: Cert[] | null }
  type Row = {
    id: string
    application_no: string
    applicant_name: string
    phone: string
    session: { schedule_type: ScheduleType; label: string; starts_on: string; ends_on: string; nights: number } | null
    participants: Part[] | null
  }

  const rows: CertificateRosterRow[] = []
  for (const r of (data as unknown as Row[]) ?? []) {
    const st = r.session?.schedule_type ?? 'jikmu'
    const isJikmu = st === 'jikmu'
    const trackLabel = isJikmu ? '직무연수' : `자율패키지 · ${SCHEDULE_TYPE[st].label}`
    const period = r.session ? formatPeriod(r.session.starts_on, r.session.ends_on, r.session.nights) : ''
    const sessionLabel = r.session?.label ?? '(차수 미정)'
    const parts = (r.participants ?? []).slice().sort((a, b) => a.sort_order - b.sort_order)
    for (const p of parts) {
      const cert = (p.certificate_requests ?? []).find((c) => c.cert_type === 'completion')
      rows.push({
        participant_id: p.id,
        application_id: r.id,
        application_no: r.application_no,
        applicant_name: r.applicant_name,
        phone: r.phone,
        participant_name: p.name,
        is_leader: p.is_leader,
        session_label: sessionLabel,
        track_label: trackLabel,
        period,
        issued: cert != null,
        certificate_id: cert?.id ?? null,
        issued_at: cert?.created_at ?? null,
      })
    }
  }
  return rows
}

// 연수 차수 전체 — 프로그램(course.name) 조인 + 회차별 신청현황(점유/예비) 집계. 시작일 오름차순.
export async function getAllSessions(): Promise<SessionAdmin[]> {
  const { data, error } = await supabaseAdmin
    .from('sessions')
    .select(
      'id, course_id, label, schedule_type, starts_on, ends_on, nights, capacity, is_active, sort_order, course:courses(name)',
    )
    .order('starts_on', { ascending: true })
  if (error) {
    console.warn('[adminQueries] getAllSessions:', error)
    return []
  }
  type Row = {
    id: string
    course_id: string
    label: string
    schedule_type: ScheduleType
    starts_on: string
    ends_on: string
    nights: number
    capacity: number
    is_active: boolean
    sort_order: number
    course: { name: string } | { name: string }[] | null
  }
  const rows = (data as unknown as Row[]) ?? []
  const occ = await getSessionOccupancy(rows.map((r) => r.id))
  return rows.map((r) => {
    const c = Array.isArray(r.course) ? r.course[0] : r.course
    const o = occ.get(r.id)
    return {
      id: r.id,
      course_id: r.course_id,
      course_name: c?.name ?? '—',
      label: r.label,
      schedule_type: r.schedule_type,
      starts_on: r.starts_on,
      ends_on: r.ends_on,
      nights: r.nights,
      capacity: r.capacity,
      is_active: r.is_active,
      sort_order: r.sort_order,
      occupied: o?.occupied ?? 0,
      waitlisted: o?.waitlisted ?? 0,
    }
  })
}

// 요금 전체(비활성 포함). 카테고리·sort_order 순. 공개 getPriceItems 와 달리 is_active 포함.
export async function getAllPriceItems(): Promise<PriceItemAdmin[]> {
  const { data, error } = await supabaseAdmin
    .from('price_items')
    .select('id, category, item_key, label, amount, is_active, sort_order')
    .order('category', { ascending: true })
    .order('sort_order', { ascending: true })
  if (error) {
    console.warn('[adminQueries] getAllPriceItems:', error)
    return []
  }
  return (data as PriceItemAdmin[]) ?? []
}

// 차수별 요금 오버라이드 전체 — 차수 편집(요금 조정) 모달에서 세션별로 인덱싱해 사용.
export async function getAllSessionOverrides(): Promise<SessionPriceOverride[]> {
  const { data, error } = await supabaseAdmin
    .from('session_price_overrides')
    .select('session_id, item_key, amount')
  if (error) {
    console.warn('[adminQueries] getAllSessionOverrides:', error)
    return []
  }
  return (data as SessionPriceOverride[]) ?? []
}

// 차수 폼 프로그램(과정) 선택지 — 활성 코스만.
export async function getSelectableCourses(): Promise<CourseOption[]> {
  const { data, error } = await supabaseAdmin
    .from('courses')
    .select('id, name, course_type, sport')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  if (error) {
    console.warn('[adminQueries] getSelectableCourses:', error)
    return []
  }
  return (data as CourseOption[]) ?? []
}
