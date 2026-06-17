import type { PlanningStore } from '../types/planning'
import type { ScheduleData } from '../types/schedule'
import { normalizeTeacherField } from './normalize'

const TEACHER_SPLIT = /[,;/\n\r]+|(?:\s+та\s+)|(?:\s+і\s+)/i

function cleanTeacherRaw(value: string): string {
  return String(value ?? '')
    .replace(/\u00a0/g, ' ')
    .replace(/\u200b/g, '')
    .trim()
}

function isPlaceholder(value: string): boolean {
  const raw = cleanTeacherRaw(value).toLowerCase()
  return raw === 'викладач' || raw === 'прізвище'
}

/** Розбиває комірку навплану на окремих викладачів. */
export function splitTeacherField(value: string): string[] {
  const raw = cleanTeacherRaw(value)
  if (!raw || isPlaceholder(raw)) return []

  const set = new Set<string>()
  const chunks = raw.split(TEACHER_SPLIT).map((part) => part.trim()).filter(Boolean)
  const parts = chunks.length > 0 ? chunks : [raw]

  for (const part of parts) {
    const normalized = normalizeTeacherField(part)
    if (normalized.length >= 3) set.add(normalized)
  }

  const whole = normalizeTeacherField(raw)
  if (whole.length >= 3) set.add(whole)

  return [...set]
}

export function collectTeacherOptions(store: PlanningStore, schedule?: ScheduleData | null): string[] {
  const set = new Set<string>()

  const add = (value: string) => {
    for (const teacher of splitTeacherField(value)) set.add(teacher)
  }

  for (const row of store.navPlan) add(row.teacher)
  for (const row of store.roomRules) add(row.teacher)

  if (schedule) {
    for (const teacher of schedule.teachers) add(teacher.name)
    for (const entry of schedule.entries) add(entry.teacher)
  }

  return [...set].sort((a, b) => a.localeCompare(b, 'uk'))
}

export function countNavPlanRowsWithTeacher(store: PlanningStore): number {
  return store.navPlan.filter((row) => cleanTeacherRaw(row.teacher).length > 0).length
}

export function countNavPlanTeachers(store: PlanningStore): number {
  const set = new Set<string>()
  for (const row of store.navPlan) {
    for (const teacher of splitTeacherField(row.teacher)) set.add(teacher)
  }
  return set.size
}

/** Пошук викладача за частиною прізвища або ПІБ. */
export function matchesTeacherSearch(name: string, query: string): boolean {
  const q = cleanTeacherRaw(query).toLowerCase()
  if (!q) return true

  const raw = cleanTeacherRaw(name).toLowerCase()
  const normalized = normalizeTeacherField(name).toLowerCase()
  const surname = normalized.split(/\s+/)[0] ?? raw.split(/\s+/)[0] ?? ''

  if (raw.includes(q) || normalized.includes(q)) return true
  if (surname.startsWith(q)) return true

  return false
}

export function filterTeacherOptions(options: string[], query: string, limit = 40): string[] {
  const q = cleanTeacherRaw(query)
  const filtered = q ? options.filter((opt) => matchesTeacherSearch(opt, q)) : options
  return filtered.slice(0, limit)
}
