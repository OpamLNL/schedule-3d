import type { ScheduleMeta } from '../types/schedule'
import { slotToDayPeriod } from './slots'

export type SlotContext = {
  slotId: number
  dayIndex: number
  day: string
  period: number
}

export function slotContext(slotId: number, meta: ScheduleMeta): SlotContext {
  const { dayIndex, day, period } = slotToDayPeriod(slotId, meta)
  return { slotId, dayIndex, day, period }
}

export function shiftPeriodRange(shift: 1 | 2): { from: number; to: number } {
  return shift === 1 ? { from: 1, to: 4 } : { from: 5, to: 8 }
}

export function allowedSlotIds(meta: ScheduleMeta, shift: 1 | 2): number[] {
  const { from, to } = shiftPeriodRange(shift)
  const slots: number[] = []
  for (let dayIndex = 0; dayIndex < meta.days.length; dayIndex += 1) {
    for (let period = from; period <= to; period += 1) {
      slots.push(dayIndex * meta.periodsPerDay + period)
    }
  }
  return slots
}

export function isPhysicalEducation(subject: string): boolean {
  const s = subject.toLowerCase()
  return s.includes('фізич') || s.includes('фізкульт') || s.includes('фіз. к')
}

export function teacherAllowsSlot(
  teacherPref: string | undefined,
  ctx: SlotContext,
): boolean {
  if (!teacherPref) return true
  const rules = teacherPref.split(/[,;\s]+/).filter(Boolean)
  for (const rule of rules) {
    if (rule === 'не_1' && ctx.period === 1) return false
    if (rule === 'не_4' && ctx.period === 4) return false
    if (rule === 'не_перші' && ctx.period <= 2) return false
    if (rule === 'не_останні' && ctx.period >= 7) return false
    if (rule === 'не_понеділок' && ctx.dayIndex === 0) return false
    if (rule === 'не_пятниця' && ctx.dayIndex === 4) return false
    if (rule === 'тільки_зміна_1' && ctx.period > 4) return false
    if (rule === 'тільки_зміна_2' && ctx.period < 5) return false
  }
  return true
}

/** Макс. пар викладача на день. За замовчуванням 4; преференції max_1_день … max_5_день. */
export function teacherDayPairLimit(teacherPref: string | undefined): number {
  if (!teacherPref) return 4
  if (teacherPref.includes('max_5_день')) return 5
  if (teacherPref.includes('max_4_день')) return 4
  if (teacherPref.includes('max_3_день')) return 3
  if (teacherPref.includes('max_2_день')) return 2
  if (teacherPref.includes('max_1_день')) return 1
  return 4
}

/**
 * Оцінка завантаження викладача в день (менше = краще).
 * За замовчуванням прагнемо 3–4 пари на день, уникаємо «розмазування» по 1–2.
 * null — слот заборонено (перевищено денний ліміт).
 */
export function scoreTeacherDailyLoad(
  pairsOnDayBefore: number,
  teacherPref: string | undefined,
): number | null {
  const after = pairsOnDayBefore + 1
  const max = teacherDayPairLimit(teacherPref)
  if (after > max) return null

  if (pairsOnDayBefore === 0) return 150
  if (after === 4 && max >= 4) return -140
  if (after === 3) return -115
  if (after === 2) return -65
  return -15
}

export function subjectDayLimit(subjectPref: string | undefined): number {
  if (!subjectPref) return 2
  if (subjectPref.includes('max_1_день')) return 1
  if (subjectPref.includes('max_2_день')) return 2
  return 2
}

export function subjectAllowsDay(subjectPref: string | undefined, dayIndex: number): boolean {
  if (!subjectPref) return true
  if (subjectPref.includes('не_1_день') && dayIndex === 0) return false
  if (subjectPref.includes('не_5_день') && dayIndex === 4) return false
  return true
}

export { pairsPerWeek, springSchedulableHours as springContactHours } from './subjectSchedule'
export { isSchedulableSubject, isSchedulableNavPlanRow } from './navPlanClassify'

export function pePeriodScore(ctx: SlotContext, shift: 1 | 2): number {
  if (ctx.period === 1 || ctx.period === 8) return 0
  if (shift === 2 && (ctx.period === 5 || ctx.period === 8)) return 0
  return Math.abs(ctx.period - (shift === 1 ? 1 : 5)) + 1
}
