import 'server-only'
import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

// 서버 전용 암호화·서명 유틸. 절대 클라 번들 유입 금지('server-only' 가 컴파일 타임 차단).
// - 주민등록번호 뒷자리(보험용): AES-256-GCM 로 암호화해 birth_back_enc 에 "암호문만" 저장.
// - 마이페이지 세션 토큰: HMAC-SHA256 서명(opaque). 원문 PII 는 담지 않고 phone·name 만.

// ── 대칭키 암호화 (AES-256-GCM) ──────────────────────────────────────────────
// APP_ENC_KEY = 32바이트 키의 hex(64자) 또는 base64. 미설정 시 암호화 시도에서만 throw
// (보험 미희망 신청은 뒷자리가 없어 키 없이도 정상 동작).
function encKey(): Buffer {
  const raw = process.env.APP_ENC_KEY
  if (!raw) throw new Error('APP_ENC_KEY 미설정 — 주민번호 뒷자리 암호화 불가')
  const buf = /^[0-9a-fA-F]{64}$/.test(raw) ? Buffer.from(raw, 'hex') : Buffer.from(raw, 'base64')
  if (buf.length !== 32) throw new Error('APP_ENC_KEY 는 32바이트(hex 64자 또는 base64)여야 함')
  return buf
}

// 저장 포맷: v1:{iv_hex}:{tag_hex}:{ct_hex}
export function encryptSecret(plain: string): string {
  const key = encKey()
  const iv = randomBytes(12)
  const cipher = createCipheriv('aes-256-gcm', key, iv)
  const ct = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag = cipher.getAuthTag()
  return `v1:${iv.toString('hex')}:${tag.toString('hex')}:${ct.toString('hex')}`
}

export function decryptSecret(enc: string): string {
  const [v, ivHex, tagHex, ctHex] = enc.split(':')
  if (v !== 'v1' || !ivHex || !tagHex || !ctHex) throw new Error('암호문 포맷 오류')
  const decipher = createDecipheriv('aes-256-gcm', encKey(), Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(tagHex, 'hex'))
  return Buffer.concat([decipher.update(Buffer.from(ctHex, 'hex')), decipher.final()]).toString('utf8')
}

// ── 마이페이지 세션 토큰 (HMAC 서명) ─────────────────────────────────────────
// 토큰 = base64url(payload).base64url(hmac). payload = { phone, name, iat }.
// 검증 성공 = 조회 권한. 원문 생년월일은 담지 않는다(게이트 통과 후엔 phone 로 조회).
export interface MyToken {
  phone: string
  name: string
  iat: number // 발급 시각(ms)
}

const TOKEN_TTL_MS = 60 * 60 * 24 * 30 * 1000 // 30일

function tokenSecret(): Buffer {
  const raw = process.env.MY_SESSION_SECRET
  if (!raw) throw new Error('MY_SESSION_SECRET 미설정 — 마이페이지 토큰 발급 불가')
  return Buffer.from(raw, 'utf8')
}

function sign(payloadB64: string): string {
  return createHmac('sha256', tokenSecret()).update(payloadB64).digest('base64url')
}

export function issueMyToken(phone: string, name: string, iat: number): string {
  const payloadB64 = Buffer.from(JSON.stringify({ phone, name, iat } satisfies MyToken)).toString('base64url')
  return `${payloadB64}.${sign(payloadB64)}`
}

// 유효하면 payload, 아니면 null(위조·만료·손상 모두 null).
export function verifyMyToken(token: string, now: number): MyToken | null {
  const [payloadB64, sig] = token.split('.')
  if (!payloadB64 || !sig) return null
  const expected = sign(payloadB64)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as MyToken
    if (typeof payload.phone !== 'string' || typeof payload.iat !== 'number') return null
    if (now - payload.iat > TOKEN_TTL_MS) return null
    return payload
  } catch {
    return null
  }
}

// ── 셀프필 링크 토큰 (동반인 후속입력 공개페이지) ─────────────────────────────
// 대표가 URL 을 복사해 단톡 공유(시스템 발송 없음=SMS 비용 0). 토큰 자체가 크리덴셜.
// applicationId 만 담고, 서명은 'fill:' 도메인 분리 → 마이 세션토큰과 교차 사용 불가.
// PII·뒷자리는 담지 않는다(로스터는 서버가 aid 로 조회, 뒷자리는 write-only).
export interface FillToken {
  aid: string // application id
  iat: number // 발급 시각(ms)
}

const FILL_TTL_MS = 60 * 60 * 24 * 120 * 1000 // 120일 — 신청~연수 종료까지 충분

function signFill(payloadB64: string): string {
  return createHmac('sha256', tokenSecret()).update(`fill:${payloadB64}`).digest('base64url')
}

export function issueFillToken(applicationId: string, iat: number): string {
  const payloadB64 = Buffer.from(JSON.stringify({ aid: applicationId, iat } satisfies FillToken)).toString('base64url')
  return `${payloadB64}.${signFill(payloadB64)}`
}

export function verifyFillToken(token: string, now: number): FillToken | null {
  const [payloadB64, sig] = token.split('.')
  if (!payloadB64 || !sig) return null
  const expected = signFill(payloadB64)
  const a = Buffer.from(sig)
  const b = Buffer.from(expected)
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as FillToken
    if (typeof payload.aid !== 'string' || typeof payload.iat !== 'number') return null
    if (now - payload.iat > FILL_TTL_MS) return null
    return payload
  } catch {
    return null
  }
}
