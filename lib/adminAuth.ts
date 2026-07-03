// 어드민 인증 상수 — 엣지(middleware)·서버(route) 공용. Node 전용 import 금지(엣지에서 로드됨).
//
// ⚠ MVP: 자격증명 하드코딩 + 정적 세션 토큰(httpOnly 쿠키). 오너 지시(2026-07-03).
//   실서비스 전 admins 테이블 + 비번 해시 + 서명 세션으로 승격 필요.
export const ADMIN_USERNAME = 'pea2026'
export const ADMIN_PASSWORD = 'pea2026!@'

export const ADMIN_COOKIE = 'pea_admin'
// 로그인 성공 시 쿠키에 담기는 불투명 토큰. httpOnly라 클라 JS 접근 불가, 미들웨어에서 값 비교.
export const ADMIN_SESSION_TOKEN = 'pea-admin-session-2026-9f3c1a7b4e'
// 세션 유지(초). 8시간.
export const ADMIN_SESSION_MAX_AGE = 60 * 60 * 8
