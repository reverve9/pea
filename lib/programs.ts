// 프로그램(종목) 정의 — 신청 페이지·어드민 신청관리 공용 진실원천.
// 프로그램 = 종목(course.sport). 스키·스노보드는 직무/자율 두 유형을 공유. 나머지는 준비중.
// 순수 데이터만(‘server-only’ 금지 — 클라에서 import).

export interface Program {
  key: string
  title: string
  en: string
  sport: string // courses.sport 와 매칭(신청건 → 프로그램 판정)
  code: string // 신청번호 종목 코드(S/T/W/E)
  ready: boolean
}

export const PROGRAMS: Program[] = [
  { key: 'ski', title: '스키·스노보드', en: 'Ski & Snowboard', sport: '스키·스노보드', code: 'S', ready: true },
  { key: 'tennis', title: '테니스', en: 'Tennis', sport: '테니스', code: 'T', ready: false },
  { key: 'windsurf', title: '윈드서핑', en: 'Windsurfing', sport: '윈드서핑', code: 'W', ready: false },
  { key: 'rehab', title: '운동처방', en: 'Exercise Rx', sport: '운동처방', code: 'E', ready: false },
]

// 화면에 노출할 개설 종목만(ready:true). 준비중 종목은 PROGRAMS엔 남겨두고 렌더에서만 제외 —
// 개설 시 해당 종목 ready:true 로만 바꾸면 탭/카드/유형이 자동 복구된다. 렌더 순회는 이 배열을 쓸 것.
// (find/매칭류 — programBySport·applicationPrefix·activeProgram — 은 전체 PROGRAMS 유지.)
export const OPEN_PROGRAMS: Program[] = PROGRAMS.filter((p) => p.ready)

export function programBySport(sport: string | null | undefined): Program | undefined {
  return PROGRAMS.find((p) => p.sport === sport)
}

// 신청번호 접두어 = 종목코드 + 유형코드. 유형: 직무연수=CT(Credit Training)·자율패키지=FP(Free Package).
// 예) 스키·스노보드 자율 → 'SFP', 스키·스노보드 직무 → 'SCT'. 미매칭 종목은 'X'로 폴백.
export function applicationPrefix(sport: string | null | undefined, kind: 'jikmu' | 'jayul'): string {
  const code = programBySport(sport)?.code ?? 'X'
  return code + (kind === 'jikmu' ? 'CT' : 'FP')
}
