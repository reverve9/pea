// 최소 서비스워커 — 설치 가능성(Android beforeinstallprompt) 충족용.
// 오프라인 캐싱은 하지 않고 네트워크 통과(respondWith 미호출). 향후 캐시 전략 필요 시 확장.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {
  // pass-through: 브라우저 기본 처리
})
