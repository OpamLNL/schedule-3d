import * as XLSX from 'xlsx'
import type { NavPlanRow } from '../types/planning'
import { classifyNavPlanRow } from './navPlanClassify'
import { newId, normalizeGroupCode, normalizeSubjectKey, normalizeTeacherField, parseNumber } from './normalize'

const COL = {
  subject: 0,
  teacher: 1,
  hoursTotal: 2,
  hoursCourse: 3,
  hoursSelf: 4,
  fallLectures: 5,
  fallPractical: 6,
  fallLab: 7,
  fallCoursework: 8,
  fallConsult: 9,
  fallCredits: 10,
  fallExams: 11,
  fallTotal: 12,
  springLectures: 13,
  springPractical: 14,
  springLab: 15,
  springCoursework: 16,
  springConsult: 17,
  springSupervised: 18,
  springCredits: 19,
  springExams: 20,
  springDpa: 21,
  springDkk: 22,
  springTotal: 23,
  budget: 24,
  extraBudget: 25,
  group: 26,
} as const

export function normalizeNavPlanRow(row: Partial<NavPlanRow> & { id: string }): NavPlanRow {
  const subject = row.subject ?? ''
  const base = {
    id: row.id,
    subject,
    subjectNorm: row.subjectNorm ?? normalizeSubjectKey(subject),
    teacher: normalizeTeacherField(row.teacher ?? ''),
    hoursTotal: row.hoursTotal ?? 0,
    hoursCourse: row.hoursCourse ?? 0,
    hoursSelf: row.hoursSelf ?? 0,
    fallLectures: row.fallLectures ?? 0,
    fallPractical: row.fallPractical ?? 0,
    fallLab: row.fallLab ?? 0,
    fallCoursework: row.fallCoursework ?? 0,
    fallConsult: row.fallConsult ?? 0,
    fallCredits: row.fallCredits ?? 0,
    fallExams: row.fallExams ?? 0,
    hoursFall: row.hoursFall ?? 0,
    springLectures: row.springLectures ?? 0,
    springPractical: row.springPractical ?? 0,
    springLab: row.springLab ?? 0,
    springCoursework: row.springCoursework ?? 0,
    springConsult: row.springConsult ?? 0,
    springSupervised: row.springSupervised ?? 0,
    springCredits: row.springCredits ?? 0,
    springExams: row.springExams ?? 0,
    springDpa: row.springDpa ?? 0,
    springDkk: row.springDkk ?? 0,
    hoursSpring: row.hoursSpring ?? 0,
    groupCode: row.groupCode ?? '',
    budget: row.budget ?? 0,
    extraBudget: row.extraBudget ?? 0,
  } satisfies Omit<NavPlanRow, 'planKind' | 'planKindLabel'>

  const classified = classifyNavPlanRow(base as NavPlanRow)
  return {
    ...base,
    planKind: classified.kind,
    planKindLabel: classified.label,
  }
}

function normalizeSubject(value: unknown): string | null {
  const subject = String(value ?? '').trim()
  if (!subject || subject.length < 4) return null
  if (/^[\d\s.,]+$/.test(subject)) return null
  if (subject.toLowerCase().includes('заст. директора')) return null
  if (subject.startsWith('РОЗПОДІЛ')) return null
  return subject.replace(/\*+/g, '').trim()
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < Math.min(rows.length, 20); i += 1) {
    if (String(rows[i]?.[COL.subject] ?? '').includes('Назва навчальних')) return i
  }
  return 4
}

function isGroupCode(value: string): boolean {
  const code = normalizeGroupCode(value)
  if (!code || code.length < 3) return false
  if (/^[\d.,]+$/.test(code)) return false
  return /[A-ZА-ЯІЇЄҐ]/.test(code) && /\d/.test(code)
}

export function parseNavPlanWorkbook(workbook: XLSX.WorkBook, sheetName?: string): NavPlanRow[] {
  const name =
    sheetName ??
    workbook.SheetNames.find((n) => n.toLowerCase().includes('навчальн')) ??
    workbook.SheetNames[0]
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[name], {
    header: 1,
    defval: '',
  })

  const headerRow = findHeaderRow(rows)
  const dataStart = headerRow + 2
  const result: NavPlanRow[] = []

  for (let i = dataStart; i < rows.length; i += 1) {
    const row = rows[i] ?? []
    const subject = normalizeSubject(row[COL.subject])
    const groupRaw = String(row[COL.group] ?? '').trim()
    if (!subject || !isGroupCode(groupRaw)) continue

    const teacherRaw = String(row[COL.teacher] ?? '').trim()

    result.push(
      normalizeNavPlanRow({
        id: newId('np'),
        subject,
        subjectNorm: normalizeSubjectKey(subject),
        teacher: teacherRaw,
        hoursTotal: parseNumber(row[COL.hoursTotal]),
        hoursCourse: parseNumber(row[COL.hoursCourse]),
        hoursSelf: parseNumber(row[COL.hoursSelf]),
        fallLectures: parseNumber(row[COL.fallLectures]),
        fallPractical: parseNumber(row[COL.fallPractical]),
        fallLab: parseNumber(row[COL.fallLab]),
        fallCoursework: parseNumber(row[COL.fallCoursework]),
        fallConsult: parseNumber(row[COL.fallConsult]),
        fallCredits: parseNumber(row[COL.fallCredits]),
        fallExams: parseNumber(row[COL.fallExams]),
        hoursFall: parseNumber(row[COL.fallTotal]),
        springLectures: parseNumber(row[COL.springLectures]),
        springPractical: parseNumber(row[COL.springPractical]),
        springLab: parseNumber(row[COL.springLab]),
        springCoursework: parseNumber(row[COL.springCoursework]),
        springConsult: parseNumber(row[COL.springConsult]),
        springSupervised: parseNumber(row[COL.springSupervised]),
        springCredits: parseNumber(row[COL.springCredits]),
        springExams: parseNumber(row[COL.springExams]),
        springDpa: parseNumber(row[COL.springDpa]),
        springDkk: parseNumber(row[COL.springDkk]),
        hoursSpring: parseNumber(row[COL.springTotal]),
        groupCode: normalizeGroupCode(groupRaw),
        budget: parseNumber(row[COL.budget]),
        extraBudget: parseNumber(row[COL.extraBudget]),
      }),
    )
  }

  return result
}

export async function parseNavPlanFile(file: File): Promise<NavPlanRow[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: 'array' })
  return parseNavPlanWorkbook(workbook)
}

export function parseGroupsWeeksWorkbook(workbook: XLSX.WorkBook): Map<string, { weeksFall: number; weeksSpring: number }> {
  const sheetName = workbook.SheetNames.find((n) => n.toLowerCase().includes('тижн'))
  if (!sheetName) return new Map()

  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[sheetName], {
    header: 1,
    defval: '',
  })

  const map = new Map<string, { weeksFall: number; weeksSpring: number }>()
  for (let i = 1; i < rows.length; i += 1) {
    const code = normalizeGroupCode(String(rows[i]?.[0] ?? ''))
    if (!code) continue
    map.set(code, {
      weeksFall: parseNumber(rows[i]?.[1]),
      weeksSpring: parseNumber(rows[i]?.[2]),
    })
  }
  return map
}
