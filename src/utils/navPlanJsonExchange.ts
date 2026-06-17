import type { NavPlanSnapshot } from '../types/documents'
import type { PlanningStore } from '../types/planning'
import { ensureEditorName } from '../storage/editorIdentity'
import { normalizeNavPlanRow } from './parseNavPlan'
import { downloadJsonFile } from './schedulePrintExport'

export const NAV_PLAN_JSON_TYPE = 'schedule3d-navplan-v1'

export type NavPlanExportDocument = {
  type: typeof NAV_PLAN_JSON_TYPE
  label: string
  savedAt: string
  savedBy: string
  note?: string
  sourceFileName?: string
  columnsVersion: number
  rowCount: number
  payload: NavPlanSnapshot['payload']
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function buildNavPlanExport(
  store: PlanningStore,
  options?: { label?: string; note?: string; savedBy?: string },
): NavPlanExportDocument {
  return {
    type: NAV_PLAN_JSON_TYPE,
    label: options?.label?.trim() || `Навплан ${new Date().toLocaleString('uk-UA')}`,
    savedAt: new Date().toISOString(),
    savedBy: options?.savedBy?.trim() || ensureEditorName(),
    note: options?.note?.trim() || undefined,
    sourceFileName: store.navPlanSource,
    columnsVersion: store.navPlanColumnsVersion ?? 2,
    rowCount: store.navPlan.length,
    payload: {
      navPlan: store.navPlan.map((row) => ({ ...row })),
      groups: structuredClone(store.groups),
      roomRules: structuredClone(store.roomRules),
      teacherPrefs: structuredClone(store.teacherPrefs),
      subjectPrefs: structuredClone(store.subjectPrefs),
      navPlanSource: store.navPlanSource,
      navPlanColumnsVersion: store.navPlanColumnsVersion ?? 2,
    },
  }
}

export function snapshotToExportDocument(snapshot: NavPlanSnapshot): NavPlanExportDocument {
  return {
    type: NAV_PLAN_JSON_TYPE,
    label: snapshot.label,
    savedAt: snapshot.savedAt,
    savedBy: snapshot.savedBy,
    note: snapshot.note,
    sourceFileName: snapshot.sourceFileName,
    columnsVersion: snapshot.columnsVersion,
    rowCount: snapshot.rowCount,
    payload: snapshot.payload,
  }
}

export function parseNavPlanImport(raw: unknown): NavPlanExportDocument {
  if (!isRecord(raw)) throw new Error('Некоректний JSON')

  const payload = raw.payload
  if (isRecord(payload) && Array.isArray(payload.navPlan)) {
    return {
      type: NAV_PLAN_JSON_TYPE,
      label: String(raw.label ?? 'Імпорт'),
      savedAt: String(raw.savedAt ?? new Date().toISOString()),
      savedBy: String(raw.savedBy ?? 'невідомо'),
      note: raw.note ? String(raw.note) : undefined,
      sourceFileName: raw.sourceFileName ? String(raw.sourceFileName) : undefined,
      columnsVersion: Number(raw.columnsVersion ?? payload.navPlanColumnsVersion ?? 2),
      rowCount: Number(raw.rowCount ?? payload.navPlan.length),
      payload: payload as NavPlanExportDocument['payload'],
    }
  }

  if ('id' in raw && isRecord(raw.payload) && Array.isArray(raw.payload.navPlan)) {
    return snapshotToExportDocument(raw as NavPlanSnapshot)
  }

  throw new Error('У файлі немає даних навплану (очікується payload.navPlan)')
}

export function applyNavPlanImport(store: PlanningStore, doc: NavPlanExportDocument): PlanningStore {
  return {
    ...store,
    ...doc.payload,
    navPlan: doc.payload.navPlan.map((row) => normalizeNavPlanRow(row)),
    groups: structuredClone(doc.payload.groups ?? store.groups),
    roomRules: structuredClone(doc.payload.roomRules ?? store.roomRules),
    teacherPrefs: structuredClone(doc.payload.teacherPrefs ?? store.teacherPrefs),
    subjectPrefs: structuredClone(doc.payload.subjectPrefs ?? store.subjectPrefs),
  }
}

export function exportNavPlanDocumentFile(doc: NavPlanExportDocument, filename?: string): void {
  const safe = doc.label.replace(/[^\w\u0400-\u04FF-]+/g, '_').slice(0, 40) || 'navplan'
  const datePart = doc.savedAt.slice(0, 10)
  downloadJsonFile(doc, filename ?? `navplan-${safe}-${datePart}.json`)
}
