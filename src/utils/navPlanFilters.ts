import type { NavPlanFilters, NavPlanRow } from '../types/planning'
import { normalizeGroupCode, normalizeSubjectKey, normalizeTeacherField } from './normalize'
import { isExcludedNavPlanKind } from './navPlanClassify'

export const defaultNavPlanFilters: NavPlanFilters = {
  query: '',
  groupCode: '',
  subject: '',
  teacher: '',
  onlyWithTeacher: false,
  planKind: 'schedule',
  exams: '',
  credits: '',
  lectures: '',
  hoursTotalMin: '',
  hoursTotalMax: '',
}

export function totalExams(row: NavPlanRow): number {
  return row.fallExams + row.springExams
}

export function totalCredits(row: NavPlanRow): number {
  return row.fallCredits + row.springCredits
}

export function totalLectures(row: NavPlanRow): number {
  return row.fallLectures + row.springLectures
}

function parseBound(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const n = Number(trimmed.replace(',', '.'))
  return Number.isFinite(n) ? n : null
}

function matchesText(haystack: string, needle: string): boolean {
  const q = needle.trim().toLowerCase()
  if (!q) return true
  return haystack.toLowerCase().includes(q)
}

function matchesGroup(rowCode: string, filter: string): boolean {
  const q = filter.trim()
  if (!q) return true
  const code = normalizeGroupCode(rowCode)
  const query = normalizeGroupCode(q)
  return code.includes(query) || matchesText(rowCode, q)
}

function matchesSubject(row: NavPlanRow, filter: string): boolean {
  const q = filter.trim()
  if (!q) return true
  return (
    matchesText(row.subject, q) ||
    row.subjectNorm.includes(normalizeSubjectKey(q))
  )
}

function matchesTeacher(rowTeacher: string, filter: string): boolean {
  const q = filter.trim()
  if (!q) return true
  const normalizedRow = normalizeTeacherField(rowTeacher).toLowerCase()
  const normalizedQuery = normalizeTeacherField(q).toLowerCase()
  if (normalizedQuery && normalizedRow.includes(normalizedQuery)) return true
  return matchesText(rowTeacher, q)
}

/** Порожньо = усі; «є»/«немає» або число годин/кількості. */
function matchesTriSearch(value: number, filter: string): boolean {
  const f = filter.trim().toLowerCase()
  if (!f) return true
  if (['є', 'yes', 'так', '1', '+', 'y'].includes(f)) return value > 0
  if (['немає', 'нема', 'no', 'ні', '0', '-', 'n'].includes(f)) return value === 0
  const n = Number(f.replace(',', '.'))
  if (Number.isFinite(n)) return value === n
  return String(value).includes(f)
}

export function filterNavPlanRows(rows: NavPlanRow[], filters: NavPlanFilters): NavPlanRow[] {
  const q = filters.query.trim().toLowerCase()
  const minTotal = parseBound(filters.hoursTotalMin)
  const maxTotal = parseBound(filters.hoursTotalMax)

  return rows.filter((row) => {
    if (filters.planKind === 'schedule' && row.planKind !== 'schedule') return false
    if (filters.planKind === 'excluded' && !isExcludedNavPlanKind(row.planKind)) return false
    if (
      filters.planKind !== 'all' &&
      filters.planKind !== 'schedule' &&
      filters.planKind !== 'excluded' &&
      row.planKind !== filters.planKind
    ) {
      return false
    }
    if (!matchesGroup(row.groupCode, filters.groupCode)) return false
    if (!matchesSubject(row, filters.subject)) return false
    if (!matchesTeacher(row.teacher, filters.teacher)) return false
    if (filters.onlyWithTeacher && !row.teacher) return false
    if (!matchesTriSearch(totalExams(row), filters.exams)) return false
    if (!matchesTriSearch(totalCredits(row), filters.credits)) return false
    if (!matchesTriSearch(totalLectures(row), filters.lectures)) return false
    if (minTotal !== null && row.hoursTotal < minTotal) return false
    if (maxTotal !== null && row.hoursTotal > maxTotal) return false
    if (!q) return true
    return (
      row.subject.toLowerCase().includes(q) ||
      row.subjectNorm.includes(q) ||
      row.teacher.toLowerCase().includes(q) ||
      row.groupCode.toLowerCase().includes(q)
    )
  })
}

export function hasActiveNavPlanFilters(filters: NavPlanFilters): boolean {
  return (
    filters.query.trim() !== '' ||
    filters.groupCode.trim() !== '' ||
    filters.subject.trim() !== '' ||
    filters.teacher.trim() !== '' ||
    filters.onlyWithTeacher ||
    filters.planKind !== 'schedule' ||
    filters.exams.trim() !== '' ||
    filters.credits.trim() !== '' ||
    filters.lectures.trim() !== '' ||
    filters.hoursTotalMin.trim() !== '' ||
    filters.hoursTotalMax.trim() !== ''
  )
}
