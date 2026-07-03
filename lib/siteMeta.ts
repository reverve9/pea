import type { SNSUrls } from '@/components/common/SNSLinks'

// TODO(site_settings): SNS URL은 site_settings 연동 시 실제 값으로 교체.
// 지금은 우측 마스트헤드(ExtendedHeader) 시각 확인용 플레이스홀더 — 한 곳에서만 관리.
export const PLACEHOLDER_SNS: SNSUrls = {
  kakao: '#',
  instagram: '#',
  youtube: '#',
  facebook: '#',
}

// TODO(site_settings): 기관정보도 site_settings 연동 시 실제 값으로 교체.
// 지금은 푸터(리치 HomeFooter + 슬림 SlimFooter) 공용 placeholder — 한 곳에서만 관리.
export const PLACEHOLDER_ORG = {
  name: '체육교육회',
  tagline: '서울특별시교육청 지정 특수분야 직무연수기관',
  address: '서울특별시 송파구 올림픽로 000, 0층',
  ceo: '홍길동',
  bank: '국민은행',
  account: '000000-00-000000',
  accountHolder: '체육교육회',
  privacyOfficer: '홍길동',
  privacyEmail: 'privacy@pea.or.kr',
  tel: '02-000-0000',
  fax: '02-000-0001',
  email: 'info@pea.or.kr',
}
