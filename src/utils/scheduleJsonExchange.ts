import type { ScheduleDocument } from '../types/documents'
import type {
  Group,
  Room,
  ScheduleData,
  ScheduleEntry,
  ScheduleMeta,
  Teacher,
} from '../types/schedule'
import { ensureEditorName } from '../storage/editorIdentity'
import { downloadJsonFile } from './schedulePrintExport'

export const SCHEDULE_JSON_TYPE = 'schedule3d-schedule-v1'

export type ScheduleImportDocument = {
  label: string
  savedAt: string
  savedBy: string
  note?: string
  edited: boolean
  schedule: ScheduleData
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isScheduleDataShape(raw: Record<string, unknown>): boolean {
  return (
    isRecord(raw.meta) &&
    Array.isArray(raw.groups) &&
    Array.isArray(raw.teachers) &&
    Array.isArray(raw.rooms) &&
    Array.isArray(raw.entries)
  )
}

function normalizeMeta(raw: Record<string, unknown>): ScheduleMeta {
  const days = Array.isArray(raw.days) ? raw.days.map(String) : ['Пн', 'Вт', 'Ср', 'Чт', 'Пт']
  const periodsPerDay = Number(raw.periodsPerDay ?? 8)
  const totalSlots = Number(raw.totalSlots ?? days.length * periodsPerDay)

  return {
    sourceFile: String(raw.sourceFile ?? 'імпорт JSON'),
    generatedAt: String(raw.generatedAt ?? new Date().toISOString()),
    note: String(raw.note ?? ''),
    days,
    periodsPerDay: Number.isFinite(periodsPerDay) ? periodsPerDay : 8,
    totalSlots: Number.isFinite(totalSlots) ? totalSlots : days.length * periodsPerDay,
  }
}

function normalizeGroup(raw: unknown, index: number): Group {
  const row = isRecord(raw) ? raw : {}
  const code = String(row.code ?? `G${index + 1}`)
  return {
    id: String(row.id ?? `g${index + 1}`),
    code,
    name: String(row.name ?? `Група ${code}`),
    specialty: String(row.specialty ?? code.replace(/\d.*/, '')),
    course: Number(row.course ?? 1) || 1,
    room: String(row.room ?? ''),
  }
}

function normalizeTeacher(raw: unknown, index: number): Teacher {
  const row = isRecord(raw) ? raw : {}
  const name = String(row.name ?? '').trim()
  return {
    id: String(row.id ?? `t${index + 1}`),
    name: name || `Викладач ${index + 1}`,
  }
}

function normalizeRoom(raw: unknown, index: number): Room {
  const row = isRecord(raw) ? raw : {}
  return {
    id: String(row.id ?? `r${index + 1}`),
    code: String(row.code ?? `room-${index + 1}`),
  }
}

function normalizeEntry(raw: unknown, index: number): ScheduleEntry {
  const row = isRecord(raw) ? raw : {}
  const entry: ScheduleEntry = {
    id: String(row.id ?? `e${index + 1}`),
    groupId: String(row.groupId ?? ''),
    slotId: Number(row.slotId ?? 0),
    subject: String(row.subject ?? ''),
    teacher: String(row.teacher ?? ''),
    room: String(row.room ?? ''),
  }
  if (row.parallelBundleId) entry.parallelBundleId = String(row.parallelBundleId)
  return entry
}

export function normalizeScheduleData(raw: Record<string, unknown>): ScheduleData {
  if (!isScheduleDataShape(raw)) {
    throw new Error('Некоректна структура розкладу (meta, groups, teachers, rooms, entries)')
  }

  return {
    meta: normalizeMeta(raw.meta as Record<string, unknown>),
    groups: (raw.groups as unknown[]).map(normalizeGroup),
    teachers: (raw.teachers as unknown[]).map(normalizeTeacher),
    rooms: (raw.rooms as unknown[]).map(normalizeRoom),
    entries: (raw.entries as unknown[]).map(normalizeEntry),
  }
}

function documentToImport(doc: ScheduleDocument): ScheduleImportDocument {
  return {
    label: doc.label,
    savedAt: doc.savedAt,
    savedBy: doc.savedBy,
    note: doc.note,
    edited: doc.edited,
    schedule: normalizeScheduleData(doc.schedule as unknown as Record<string, unknown>),
  }
}

export function parseScheduleImport(raw: unknown): ScheduleImportDocument {
  if (!isRecord(raw)) throw new Error('Некоректний JSON')

  if (raw.type === SCHEDULE_JSON_TYPE && isRecord(raw.schedule) && isScheduleDataShape(raw.schedule)) {
    return {
      label: String(raw.label ?? 'Імпорт'),
      savedAt: String(raw.savedAt ?? new Date().toISOString()),
      savedBy: String(raw.savedBy ?? 'невідомо'),
      note: raw.note ? String(raw.note) : undefined,
      edited: Boolean(raw.edited),
      schedule: normalizeScheduleData(raw.schedule),
    }
  }

  if ('schedule' in raw && isRecord(raw.schedule) && isScheduleDataShape(raw.schedule)) {
    return documentToImport(raw as ScheduleDocument)
  }

  if (isScheduleDataShape(raw)) {
    const meta = raw.meta as Record<string, unknown>
    return {
      label: String(meta.sourceFile ?? 'Імпорт'),
      savedAt: String(meta.generatedAt ?? new Date().toISOString()),
      savedBy: 'імпорт',
      edited: false,
      schedule: normalizeScheduleData(raw),
    }
  }

  throw new Error('У файлі немає даних розкладу (очікується schedule-full.json або збережена версія)')
}

export function exportScheduleDataFile(schedule: ScheduleData, filename?: string): void {
  const datePart = new Date().toISOString().slice(0, 10)
  downloadJsonFile(schedule, filename ?? `schedule-full-${datePart}.json`)
}

export function exportCurrentScheduleJson(
  schedule: ScheduleData,
  options?: { label?: string; note?: string },
): void {
  const label = options?.label?.trim() || `Розклад ${new Date().toLocaleDateString('uk-UA')}`
  const savedAt = new Date().toISOString()
  const payload = {
    type: SCHEDULE_JSON_TYPE,
    label,
    savedAt,
    savedBy: ensureEditorName(),
    note: options?.note?.trim() || undefined,
    edited: false,
    schedule: structuredClone(schedule),
  }
  const safe = label.replace(/[^\w\u0400-\u04FF-]+/g, '_').slice(0, 40) || 'schedule'
  downloadJsonFile(payload, `schedule-${safe}-${savedAt.slice(0, 10)}.json`)
}
