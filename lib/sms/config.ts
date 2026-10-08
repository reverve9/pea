// 알림톡 발송 설정 — 서버 환경변수에서만 읽는다(NEXT_PUBLIC_ 금지). 값은 출력·로그하지 않고 키 이름만 다룬다.
//   SMS_ENABLED=true        실발송 스위치(기본 꺼짐 → 이력만 held 로 남김). 이름은 문자 시절 그대로 유지.
//   SOLAPI_API_KEY / SOLAPI_API_SECRET   회사 계정 API 키
//   SOLAPI_SENDER           (선택) 솔라피 등록 발신번호. 대체문자를 보내지 않으므로 없어도 발송한다.
//   SMS_TEST_ALLOWLIST      (선택) 쉼표 구분 번호. 지정 시 이 번호로만 실발송, 나머지는 held — 테스트 기간용
// 채널 ID·템플릿 ID 는 비밀이 아니라 코드(alimtalk.ts)에 둔다.
import { ALIMTALK_TEMPLATE_IDS, KAKAO_PFID } from './alimtalk'
import type { SmsConfig, SmsKind } from './types'

export const digits = (v: string | null | undefined) => (v ?? '').replace(/\D/g, '')

export function readSmsConfig(
  env: Record<string, string | undefined> = process.env,
  kakao: { pfId: string | null; templateIds: Record<SmsKind, string | null> } = { pfId: KAKAO_PFID, templateIds: ALIMTALK_TEMPLATE_IDS },
): SmsConfig {
  const apiKey = env.SOLAPI_API_KEY?.trim() || null
  const apiSecret = env.SOLAPI_API_SECRET?.trim() || null
  const sender = digits(env.SOLAPI_SENDER) || null
  const pfId = kakao.pfId?.trim() || null
  const missing: string[] = []
  if (!apiKey) missing.push('SOLAPI_API_KEY')
  if (!apiSecret) missing.push('SOLAPI_API_SECRET')
  if (!pfId) missing.push('KAKAO_PFID')
  const allow = (env.SMS_TEST_ALLOWLIST ?? '').split(',').map(digits).filter(Boolean)
  return {
    enabled: env.SMS_ENABLED?.trim().toLowerCase() === 'true',
    apiKey,
    apiSecret,
    sender,
    pfId,
    templateIds: kakao.templateIds,
    allowlist: allow.length ? allow : null,
    missing,
  }
}

export function templateIdFor(cfg: SmsConfig, kind: SmsKind): string | null {
  return cfg.templateIds[kind]?.trim() || null
}

// 실발송 불가 사유(없으면 null) — held 로 남기고 관리자 화면에 키 이름만 안내.
export function holdReason(cfg: SmsConfig, to: string, kind: SmsKind): string | null {
  if (cfg.missing.length) return `config_missing:${cfg.missing.join(',')}`
  if (!templateIdFor(cfg, kind)) return 'template_missing'
  if (!cfg.enabled) return 'disabled'
  if (cfg.allowlist && !cfg.allowlist.includes(to)) return 'not_in_allowlist'
  return null
}

export function isValidRecipient(to: string): boolean {
  return /^01\d{8,9}$/.test(to)
}
