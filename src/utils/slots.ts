import type { ScheduleMeta } from '../types/schedule'

export function slotToDayPeriod(slotId: number, meta: ScheduleMeta) {
  const index = slotId - 1
  const dayIndex = Math.floor(index / meta.periodsPerDay)
  const period = (index % meta.periodsPerDay) + 1
  return {
    dayIndex,
    day: meta.days[dayIndex] ?? '?',
    period,
  }
}

export function slotLabel(slotId: number, meta: ScheduleMeta) {
  const { day, period } = slotToDayPeriod(slotId, meta)
  return `${day}${period}`
}

export function slotAngle(slotId: number, totalSlots: number) {
  const index = slotId - 1
  return (index / totalSlots) * Math.PI * 2 - Math.PI / 2
}

export function allSlotLabels(meta: ScheduleMeta) {
  return Array.from({ length: meta.totalSlots }, (_, index) => slotLabel(index + 1, meta))
}
