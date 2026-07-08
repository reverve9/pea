// Phase 2b — 읽기 전용 anon SELECT 쿼리 모음.
// 원칙: mutation 절대 금지(SELECT only). 실패/빈 결과는 빈 배열·null 로 정규화해
//       페이지가 항상 empty-state 로 안전하게 처리하도록 한다(레이아웃 안 깨짐).

import { supabase } from './supabase'
import type {
  Course,
  SessionWithCourse,
  PriceItem,
  SessionPriceOverride,
  Notice,
  Faq,
  SiteContent,
} from './types'

// 콘솔에 원인만 남기고 호출부엔 안전한 기본값을 돌려준다.
function warn(scope: string, error: unknown) {
  if (error) console.warn(`[queries] ${scope}:`, error)
}

// 활성 과정 목록 (sort_order 순)
export async function getCourses(): Promise<Course[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id, slug, name, course_type, sport, status, description, thumbnail_url, sort_order')
    .eq('is_active', true)
    .order('sort_order', { ascending: true })
  warn('getCourses', error)
  return (data as Course[]) ?? []
}

// 차수·일정 + 과정명 조인 (일정순)
export async function getSessions(): Promise<SessionWithCourse[]> {
  const { data, error } = await supabase
    .from('sessions')
    .select(
      'id, course_id, label, schedule_type, starts_on, ends_on, nights, capacity, sort_order, course:courses(id, name, course_type, sport)',
    )
    .eq('is_active', true)
    .order('starts_on', { ascending: true })
    .order('sort_order', { ascending: true })
  warn('getSessions', error)
  // supabase 조인은 course 를 객체로 반환(단일 FK) — 타입만 정규화
  return (data as unknown as SessionWithCourse[]) ?? []
}

// 회차 잔여 인원 — 공개 집계 RPC(session_availability, SECURITY DEFINER). 카운트만 반환(PII 없음).
export interface SessionAvailability {
  session_id: string
  capacity: number
  occupied: number
  remaining: number
}
export async function getSessionAvailability(): Promise<SessionAvailability[]> {
  const { data, error } = await supabase.rpc('session_availability')
  warn('getSessionAvailability', error)
  return (data as SessionAvailability[]) ?? []
}

// 단가 (RLS 가 is_active=true 만 노출). category+sort_order 순
export async function getPriceItems(): Promise<PriceItem[]> {
  const { data, error } = await supabase
    .from('price_items')
    .select('id, category, item_key, label, amount, sort_order')
    .order('sort_order', { ascending: true })
  warn('getPriceItems', error)
  return (data as PriceItem[]) ?? []
}

// 차수별 요금 오버라이드 전체(anon). 폼에서 선택 차수 기준으로 머지(applyOverrides). 소량이라 일괄 로드.
export async function getSessionPriceOverrides(): Promise<SessionPriceOverride[]> {
  const { data, error } = await supabase
    .from('session_price_overrides')
    .select('session_id, item_key, amount')
  warn('getSessionPriceOverrides', error)
  return (data as SessionPriceOverride[]) ?? []
}

// 공지 (RLS 가 is_published=true 만 노출). 고정 먼저, 그다음 최신순
export async function getNotices(): Promise<Notice[]> {
  const { data, error } = await supabase
    .from('notices')
    .select('id, title, content, category, is_pinned, published_at, created_at')
    .order('is_pinned', { ascending: false })
    .order('published_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
  warn('getNotices', error)
  return (data as Notice[]) ?? []
}

// FAQ (RLS 가 is_published=true 만 노출). sort_order 순
export async function getFaqs(): Promise<Faq[]> {
  const { data, error } = await supabase
    .from('faqs')
    .select('id, question, content, sort_order')
    .order('sort_order', { ascending: true })
  warn('getFaqs', error)
  return (data as Faq[]) ?? []
}

// 특정 key 의 CMS 콘텐츠 1건 (없으면 null)
export async function getSiteContent(key: string): Promise<SiteContent | null> {
  const { data, error } = await supabase
    .from('site_contents')
    .select('id, key, title, body, sort_order')
    .eq('key', key)
    .maybeSingle()
  warn(`getSiteContent(${key})`, error)
  return (data as SiteContent) ?? null
}
