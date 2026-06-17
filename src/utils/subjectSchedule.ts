import type { NavPlanRow } from '../types/planning'

/** Лекції + практичні (сем.) + лаби для тижневого розкладу весни. */
export function springTeachingFromColumns(row: NavPlanRow): number {
  return row.springLectures + row.springPractical + row.springLab
}

/** Контактні години весни (те саме джерело, що й для розкладу). */
export function springTeachingContactHours(row: NavPlanRow): number {
  const fromColumns = springTeachingFromColumns(row)
  if (fromColumns > 0) return fromColumns
  return row.hoursSpring
}

/** Години для planKind=schedule → розрахунок пар/тиждень. */
export function springSchedulableHours(row: NavPlanRow): number {
  if (row.planKind !== 'schedule') return 0
  const fromColumns = springTeachingFromColumns(row)
  if (fromColumns > 0) return fromColumns
  if (row.hoursSpring <= 0) return 0
  return row.hoursSpring
}

/** Одна академічна пара = 2 астрономічні години. */
export const HOURS_PER_PAIR = 2

/** Скільки пар за семестр (контактні години ÷ 2). */
export function semesterPairs(contactHours: number): number {
  if (contactHours <= 0) return 0
  return contactHours / HOURS_PER_PAIR
}

/** Пар на тиждень: (години ÷ 2) ÷ кількість тижнів семестру. */
export function pairsPerWeek(contactHours: number, weeks: number): number {
  if (contactHours <= 0 || weeks <= 0) return 0
  return Math.max(1, Math.round(contactHours / HOURS_PER_PAIR / weeks))
}

export { isSchedulableNavPlanRow, isSchedulableSubject } from './navPlanClassify'
