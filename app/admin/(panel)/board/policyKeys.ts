// 정책 문서 키 — 서버액션(policyActions.ts)·서버 페이지·클라이언트가 모두 참조한다.
// ⚠ 'use server' 파일에서는 async 함수만 export 할 수 있어(상수 export 시 빌드 에러) 키는 여기에 둔다.
export const PRIVACY_KEY = 'privacy_policy'
