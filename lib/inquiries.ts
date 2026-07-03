import { supabase } from './supabase'

// 1:1 문의 작성(anon INSERT — RLS inquiries_insert 허용). 열람용 비밀번호는 해시로만 저장.
// ⚠ password_hash 컬럼 필요: _DEV/seeds/04_alter_inquiries_password.sql 적용 후 동작.
// 클라 측 SHA-256 해시(열람 PIN 수준 MVP). 열람 검증은 후속 service_role 서버라우트.
async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text))
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

export interface InquiryInput {
  name?: string
  phone: string
  title: string
  content: string
  password: string
}

export async function createInquiry(input: InquiryInput): Promise<void> {
  const password_hash = input.password ? await sha256Hex(input.password) : null
  const { error } = await supabase.from('inquiries').insert({
    name: input.name?.trim() || null,
    phone: input.phone.trim(),
    title: input.title.trim(),
    content: input.content.trim(),
    is_secret: true,
    password_hash,
  })
  if (error) throw error
}

// 리스트(안전 컬럼: 마스킹 이름·제목·상태·날짜) — inquiries_public 뷰(_DEV/seeds/05).
export interface InquiryListItem {
  id: string
  name: string | null
  title: string
  status: 'open' | 'answered'
  created_at: string
}

export async function getInquiries(): Promise<InquiryListItem[]> {
  const { data, error } = await supabase
    .from('inquiries_public')
    .select('id,name,title,status,created_at')
    .order('created_at', { ascending: false })
  if (error) {
    console.warn('[inquiries] list:', error)
    return []
  }
  return (data ?? []) as InquiryListItem[]
}

// 열람 — 비번 검증 후 본문+답변(RPC get_inquiry_secret). 불일치/오류 시 null.
export interface InquiryDetail {
  title: string
  content: string
  status: string
  admin_reply: string | null
  created_at: string
}

export async function openInquiry(id: string, password: string): Promise<InquiryDetail | null> {
  const { data, error } = await supabase.rpc('get_inquiry_secret', { p_id: id, p_password: password })
  if (error) {
    console.warn('[inquiries] open:', error)
    return null
  }
  const row = Array.isArray(data) ? data[0] : data
  return (row as InquiryDetail) ?? null
}
