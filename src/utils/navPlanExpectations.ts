import type { NavPlanRow } from '../types/planning'
import { normalizeGroupCode, normalizeTeacherField } from './normalize'
import { pairsPerWeek, springSchedulableHours } from './subjectSchedule'

export type NavPlanSubjectExpectation = {
  subject: string
  groupCode: string
  pairsPerWeek: number
  hours: number
}

export function teachersMatch(a: string, b: string): boolean {
  return normalizeTeacherField(a) === normalizeTeacherField(b)
}

/** Скільки пар/тиж очікується з навплану для викладача (лише planKind=schedule). */
export function navPlanExpectationsForTeacher(
  rows: NavPlanRow[],
  teacher: string,
  weeksByGroup: Map<string, number>,
): NavPlanSubjectExpectation[] {
  const map = new Map<string, NavPlanSubjectExpectation>()

  for (const row of rows) {
    if (row.planKind !== 'schedule') continue
    if (!teachersMatch(row.teacher, teacher)) continue
    const hours = springSchedulableHours(row)
    if (hours <= 0) continue
    const weeks = weeksByGroup.get(normalizeGroupCode(row.groupCode)) ?? 16
    const weekly = pairsPerWeek(hours, weeks)
    if (weekly <= 0) continue

    const key = `${normalizeGroupCode(row.groupCode)}|${row.subject}`
    const existing = map.get(key)
    if (existing) {
      existing.pairsPerWeek = Math.max(existing.pairsPerWeek, weekly)
      existing.hours = Math.max(existing.hours, hours)
    } else {
      map.set(key, {
        subject: row.subject,
        groupCode: normalizeGroupCode(row.groupCode),
        pairsPerWeek: weekly,
        hours,
      })
    }
  }

  return [...map.values()].sort(
    (a, b) => a.subject.localeCompare(b.subject, 'uk') || a.groupCode.localeCompare(b.groupCode, 'uk'),
  )
}

export function summarizeExpectationsBySubject(
  expectations: NavPlanSubjectExpectation[],
): Array<{ subject: string; groups: Array<{ code: string; pairsPerWeek: number }> }> {
  const bySubject = new Map<string, Map<string, number>>()
  for (const item of expectations) {
    if (!bySubject.has(item.subject)) bySubject.set(item.subject, new Map())
    const groups = bySubject.get(item.subject)!
    groups.set(item.groupCode, Math.max(groups.get(item.groupCode) ?? 0, item.pairsPerWeek))
  }
  return [...bySubject.entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'uk'))
    .map(([subject, groupsMap]) => ({
      subject,
      groups: [...groupsMap.entries()]
        .sort((a, b) => a[0].localeCompare(b[0], 'uk'))
        .map(([code, pairsPerWeek]) => ({ code, pairsPerWeek })),
    }))
}
