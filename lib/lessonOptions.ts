// 강습 종목·반 정의 — 신청폼(JikmuApplyForm)과 어드민 표시의 단일 진실원천.
// participants.lesson_level 에는 반 key(예: 'ski_beginner')가 저장되며, key 가 종목+반을 인코딩한다.
// 순수 데이터만(‘server-only’ 금지 — 클라 폼에서 import).

export const LESSON_SPORTS = [
  { key: 'ski', label: '스키' },
  { key: 'board', label: '스노보드' },
] as const
export type LessonSport = (typeof LESSON_SPORTS)[number]['key']

export interface LessonClass {
  key: string
  label: string
  cond: string
  goal: string
}

// 종목별 반(입문/초급/중상급) + 편성조건 + 교육목표. 조 편성 참고용(가격 무관). 계획안 5번.
export const LESSON_CLASSES: Record<LessonSport, LessonClass[]> = {
  ski: [
    { key: 'ski_beginner', label: '입문반', cond: '첫 입문자', goal: '스키 착용법, 지상 강습, 스노우플라우턴' },
    { key: 'ski_basic', label: '초급반', cond: '1~3회 경험자', goal: '스노우플라우턴, 슈템턴' },
    { key: 'ski_adv', label: '중상급반', cond: '중급 이상 슬로프에서 자유로운 턴 가능', goal: '베이직롱턴(패러렐), 숏턴' },
  ],
  board: [
    { key: 'board_beginner', label: '입문반', cond: '첫 입문자', goal: '스노보드 착용법, 지상 강습, 사이드슬리핑, 펜쥴럼' },
    { key: 'board_basic', label: '초급반', cond: '1~3회 경험자', goal: '펜쥴럼(낙엽), 비기너턴' },
    { key: 'board_adv', label: '중상급반', cond: '중급 이상 슬로프에서 자유로운 턴 가능', goal: '너비스턴, 보드 컨트롤' },
  ],
}

// ── 자율패키지 기초 단체 강습(참고이미지 10번) — 직무의 반(입문/초급/중상급)과 다른 단순 3옵션.
//    key 는 직무 LESSON_CLASSES 와 겹치지 않게 별도 네임스페이스(jayul_).
export interface JayulLesson {
  key: string
  label: string
  goal: string
}
export const JAYUL_LESSONS: JayulLesson[] = [
  { key: 'jayul_ski', label: '스키 기초반', goal: '스키 착용법, 지상 강습, 스노우플라우턴' },
  { key: 'jayul_board', label: '스노보드 기초반', goal: '스노보드 착용법, 지상 강습, 사이드슬리핑, 펜쥴럼(낙엽)' },
  { key: 'jayul_freeride', label: '프리라이딩', goal: '자유 라이딩(강습 없이 슬로프 이용)' },
]

// ── 대여 장비(참고이미지 10번) — 세트 타입. 금액 무관(패키지 포함), 참가자별 선택.
export interface EquipmentType {
  key: string
  label: string
  detail: string
}
export const EQUIPMENT_TYPES: EquipmentType[] = [
  { key: 'ski', label: '스키', detail: '스키 + 부츠 + 폴 + 헬멧 + 부츠가방' },
  { key: 'board', label: '스노보드', detail: '스노보드 + 부츠 + 헬멧 + 부츠가방' },
]

// lesson_level(key) → 신청폼과 동일 라벨. 직무("스키 · 입문반")·자율("스키 기초반") 둘 다 커버. 매칭 실패 시 원본, 빈값 '—'.
export function lessonLevelLabel(levelKey: string | null | undefined): string {
  if (!levelKey) return '—'
  const jayul = JAYUL_LESSONS.find((l) => l.key === levelKey)
  if (jayul) return jayul.label
  for (const sport of LESSON_SPORTS) {
    const cls = LESSON_CLASSES[sport.key].find((c) => c.key === levelKey)
    if (cls) return `${sport.label} · ${cls.label}`
  }
  return levelKey
}

// 대여 장비 key → 라벨. 빈값 '—'.
export function equipmentLabel(key: string | null | undefined): string {
  if (!key) return '—'
  return EQUIPMENT_TYPES.find((e) => e.key === key)?.label ?? key
}
