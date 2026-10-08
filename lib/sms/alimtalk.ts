// 카카오 알림톡 채널·템플릿 ID — 솔라피 콘솔 값(비밀 아님). 운영 값은 이 파일에서만 바꾼다.
//   KAKAO_PFID            솔라피 콘솔 > 카카오 > 채널 관리의 채널 ID(KA01PF…)
//   ALIMTALK_TEMPLATE_IDS 종류별 템플릿 ID(KA01TP…). 2026-10-05 등록·검수 진행 중(_ref 스냅샷). null 인 종류는 보내지 않고 '보류(template_missing)'로 남긴다.
// ⚠ 템플릿 본문(templates.ts)은 카카오 승인본과 글자·줄바꿈까지 같아야 한다. 다르면 솔라피가 접수를 거절한다.
import type { SmsKind } from './types'

export const KAKAO_PFID: string | null = 'KA01PF26100209583964705CfvQBcZeK' // 체육교육회

export const ALIMTALK_TEMPLATE_IDS: Record<SmsKind, string | null> = {
  deposit_notice: 'KA01TP261004042413184qfiYDBON09g', // PEA 접수완료·입금안내
  waitlist_notice: 'KA01TP261004044330788K2YqGpY0AAe', // PEA 예비 접수 완료
  deposit_initial: 'KA01TP261004042707814Q0tN8tHytee', // PEA 입금확인
  due_notice: 'KA01TP261004043105950Fmu5mNe0dCN', // PEA 추가입금 안내
  deposit_additional: 'KA01TP261004043252072hposLJWEBPv', // PEA 추가입금 확인
  refund_received: 'KA01TP2610040435013229rOVkrNDHzb', // PEA 환불접수
  refund_completed: 'KA01TP261004043626135y1en89WTLwR', // PEA 환불완료
  auto_cancelled: 'KA01TP261004043811412wlf4nRetFiH', // PEA 자동취소
  waitlist_deposit_notice: 'KA01TP261004044604261DFFrJaTlq76', // PEA 예비접수 입금 안내
  event_reminder: 'KA01TP261004044130789cmQlbI72rRQ', // PEA 차수별 1주일 전 안내
}
