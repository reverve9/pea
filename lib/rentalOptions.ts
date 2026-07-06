// 렌탈 옵션 공통 정의 — 신청 후 대표 배정(마이)·참가자 사이즈 입력(셀프필)·어드민 공용.
// 품목/단가는 price_items(DB)가 진실원천이나, 사이즈 목록·귀속 UI 라벨은 여기서 관리(수량·비용 무관 메타).
// 용품세트(equipment=스키/스노보드)는 기본 제공이라 별도 유료옵션 아님 — lib/lessonOptions.EQUIPMENT_TYPES.

export const APPAREL_SIZES = ['S', 'M', 'L', 'XL', '2XL'] as const // 의류(스키복)
export const GEAR_SIZES = ['S', 'M', 'L'] as const // 보호대·장갑

export type RentalOptionKey = 'apparel' | 'protector' | 'goggle' | 'glove'

export interface RentalOptionMeta {
  key: RentalOptionKey
  label: string // 짧은 라벨(배정 칩·요약용)
  sizes: readonly string[] | null // null = 사이즈 없음(고글)
  sizeField: 'apparelSize' | 'protectorSize' | 'gloveSize' | null // MyParticipantInput 필드명
  rentalSizeKey: 'apparel_size' | 'protector_size' | 'glove_size' | null // participants.rentals JSON 키
}

// 배정·표시 순서 고정(의류→보호대→고글→장갑).
export const RENTAL_OPTIONS: RentalOptionMeta[] = [
  { key: 'apparel', label: '의류', sizes: APPAREL_SIZES, sizeField: 'apparelSize', rentalSizeKey: 'apparel_size' },
  { key: 'protector', label: '보호대', sizes: GEAR_SIZES, sizeField: 'protectorSize', rentalSizeKey: 'protector_size' },
  { key: 'goggle', label: '고글', sizes: null, sizeField: null, rentalSizeKey: null },
  { key: 'glove', label: '장갑', sizes: GEAR_SIZES, sizeField: 'gloveSize', rentalSizeKey: 'glove_size' },
]
