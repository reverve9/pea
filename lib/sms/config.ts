// 문자 발송 설정 — 서버 환경변수에서만 읽는다(NEXT_PUBLIC_ 금지). 값은 출력·로그하지 않고 키 이름만 다룬다.
//   SMS_ENABLED=true        실발송 스위치(기본 꺼짐 → 이력만 held 로 남김)
//   SOLAPI_API_KEY / SOLAPI_API_SECRET   회사 계정 API 키
//   SOLAPI_SENDER           솔라피에 등록·인증된 문자 발신번호
//   SMS_TEST_ALLOWLIST      (선택) 쉼표 구분 번호. 지정 시 이 번호로만 실발송, 나머지는 held — 테스트 기간용
import type { SmsConfig } from './types'

export const digits = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '')

export function readSmsConfig(env: Record<string, string | undefined> = process.env): SmsConfig {
  const apiKey = env.SOLAPI_API_KEY?.trim() || null
  const apiSecret = env.SOLAPI_API_SECRET?.trim() || null
  const sender = digits(env.SOLAPI_SENDER) || null
  const missing: string[] = []
  if (!apiKey) missing.push('SOLAPI_API_KEY')
  if (!apiSecret) missing.push('SOLAPI_API_SECRET')
  if (!sender) missing.push('SOLAPI_SENDER')
  const allow = (env.SMS_TEST_ALLOWLIST ?? '').split(',').map(digits).filter(Boolean)
  return {
    enabled: env.SMS_ENABLED?.trim().toLowerCase() === 'true',
    apiKey,
    apiSecret,
    sender,
    allowlist: allow.length ? allow : null,
    missing,
  }
}

// 실발송 불가 사유(없으면 null) — held 로 남기고 관리자 화면에 키 이름만 안내.
export function holdReason(cfg: SmsConfig, to: string): string | null {
  if (cfg.missing.length) return `config_missing:${cfg.missing.join(',')}`
  if (!cfg.enabled) return 'disabled'
  if (cfg.allowlist && !cfg.allowlist.includes(to)) return 'not_in_allowlist'
  return null
}

export function isValidRecipient(to: string): boolean {
  return /^01\d{8,9}$/.test(to)
}
