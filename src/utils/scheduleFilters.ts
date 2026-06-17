import type { EnrichedEntry, Filters, Group, ScheduleMeta, Teacher } from '../types/schedule'
import { matchesAnyTerm, matchesAnyText, splitFilterTerms } from './filterTerms'
import { normalizeGroupCode, normalizeTeacherField } from './normalize'
import { slotToDayPeriod } from './slots'

export const defaultScheduleFilters: Filters = {
  specialty: '',
  course: '',
  groupCode: '',
  teacher: '',
  day: '',
  conflictsOnly: false,
}

function matchesTeacherTerm(teacher: string, term: string): boolean {
  const normalizedRow = normalizeTeacherField(teacher).toLowerCase()
  const normalizedQuery = normalizeTeacherField(term).toLowerCase()
  if (normalizedQuery && normalizedRow.includes(normalizedQuery)) return true
  return teacher.toLowerCase().includes(term.trim().toLowerCase())
}

export function teacherMatchesFilter(teacher: string, filter: string): boolean {
  return matchesAnyTerm(filter, matchesTeacherTerm, teacher)
}

function matchesGroupTerm(group: Group, term: string): boolean {
  const code = normalizeGroupCode(group.code)
  const query = normalizeGroupCode(term)
  return (
    code.includes(query) ||
    group.name.toLowerCase().includes(term.trim().toLowerCase()) ||
    group.code.toLowerCase().includes(term.trim().toLowerCase()) ||
    group.specialty.toLowerCase().includes(term.trim().toLowerCase())
  )
}

export function groupMatchesFilter(group: Group, filter: string): boolean {
  return matchesAnyTerm(filter, matchesGroupTerm, group)
}

export function filterGroups(groups: Group[], filters: Filters): Group[] {
  return groups.filter((group) => {
    if (!matchesAnyText(group.specialty, filters.specialty)) return false
    if (splitFilterTerms(filters.course).length > 0 && !matchesAnyText(String(group.course), filters.course)) {
      return false
    }
    if (!groupMatchesFilter(group, filters.groupCode)) return false
    return true
  })
}

export function filterEntries(
  entries: EnrichedEntry[],
  meta: ScheduleMeta,
  visibleGroupIds: Set<string>,
  filters: Filters,
): EnrichedEntry[] {
  return entries.filter((entry) => {
    if (!visibleGroupIds.has(entry.groupId)) return false
    if (!teacherMatchesFilter(entry.teacher, filters.teacher)) return false
    if (splitFilterTerms(filters.day).length > 0) {
      const { day } = slotToDayPeriod(entry.slotId, meta)
      if (!matchesAnyText(day, filters.day)) return false
    }
    if (filters.conflictsOnly && entry.conflict === 'none') return false
    return true
  })
}

export function resolveSingleGroup(groups: Group[], filter: string): Group | null {
  if (splitFilterTerms(filter).length === 0) return null
  const matched = groups.filter((group) => groupMatchesFilter(group, filter))
  return matched.length === 1 ? matched[0]! : null
}

export function resolveTeachers(filter: string, teachers: Teacher[]): string[] {
  if (splitFilterTerms(filter).length === 0) return []
  return teachers.filter((teacher) => teacherMatchesFilter(teacher.name, filter)).map((teacher) => teacher.name)
}

export function hasActiveScheduleFilters(filters: Filters): boolean {
  return (
    filters.specialty.trim() !== '' ||
    filters.course.trim() !== '' ||
    filters.groupCode.trim() !== '' ||
    filters.teacher.trim() !== '' ||
    filters.day.trim() !== '' ||
    filters.conflictsOnly
  )
}
