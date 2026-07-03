import 'server-only'
import { supabaseAdmin } from './supabaseAdmin'
import type { NoticeAdmin, FaqAdmin, InquiryAdmin } from './types'

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
