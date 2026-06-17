import type { Filters } from '../types/schedule'
import { defaultScheduleFilters } from '../utils/scheduleFilters'

const STORAGE_KEY = 'schedule3d-cylinder-filters-v1'

function isFilters(value: unknown): value is Filters {
  if (!value || typeof value !== 'object') return false
  const v = value as Record<string, unknown>
  return (
    typeof v.specialty === 'string' &&
    typeof v.course === 'string' &&
    typeof v.groupCode === 'string' &&
    typeof v.teacher === 'string' &&
    typeof v.day === 'string' &&
    typeof v.conflictsOnly === 'boolean'
  )
}

export function loadCylinderFilters(): Filters {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultScheduleFilters
    const parsed: unknown = JSON.parse(raw)
    if (!isFilters(parsed)) return defaultScheduleFilters
    return { ...defaultScheduleFilters, ...parsed }
  } catch {
    return defaultScheduleFilters
  }
}

export function saveCylinderFilters(filters: Filters): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
  } catch {
    // ignore quota / private mode
  }
}

export function clearCylinderFilters(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignore
  }
}
