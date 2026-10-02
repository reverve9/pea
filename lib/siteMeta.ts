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
// 3차 수정: 주소·대표자·개인정보보호책임자·전화는 확정값. 이메일은 info@pea2025.co.kr 로 통일. 계좌·팩스는 미전달이라 기존 값 유지.
// 지금은 푸터(리치 HomeFooter + 슬림 SlimFooter) 공용 placeholder — 한 곳에서만 관리.
export const PLACEHOLDER_ORG = {
  name: '체육교육회',
  tagline: '서울특별시교육청 지정 특수분야 직무연수기관',
  address: '서울특별시 강북구 도봉로 101길 9', // 3차 수정 확정값
  ceo: '유영호', // 3차 수정 확정값
  bank: '국민은행',
  account: '000000-00-000000',
  accountHolder: '체육교육회',
  privacyOfficer: '유영호', // 3차 수정 확정값
  privacyEmail: 'info@pea2025.co.kr', // 3차 수정 확정값(방침 문서와 통일)
  tel: '070-7728-7947', // 3차 수정 확정값
  telHours: '평일 10:00~18:00', // 연결 가능 시간
  fax: '02-000-0001',
  email: 'info@pea2025.co.kr', // 3차 수정 확정값
}
