import type { ScheduleData } from '../types/schedule'

const STORAGE_KEY = 'schedule3d-spring-v1'

export function loadGeneratedSchedule(): ScheduleData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    return JSON.parse(raw) as ScheduleData
  } catch {
    return null
  }
}

export function saveGeneratedSchedule(schedule: ScheduleData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule))
}

export function clearGeneratedSchedule(): void {
  localStorage.removeItem(STORAGE_KEY)
}
