import type { NavPlanSnapshot, PrintScheduleDocument, ScheduleDocument } from '../types/documents'
import type { PlanningStore } from '../types/planning'
import type { ScheduleData } from '../types/schedule'
import { normalizeNavPlanRow } from '../utils/parseNavPlan'
import { newId } from '../utils/normalize'
import { ensureEditorName } from './editorIdentity'

const DB_NAME = 'schedule3d-files-v1'
const DB_VERSION = 2
const STORE_FILES = 'files'
const STORE_NAV_SNAPSHOTS = 'navPlanSnapshots'
const STORE_SCHEDULE_DOCS = 'scheduleDocuments'
const STORE_PRINT = 'printSchedules'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE_FILES)) {
        db.createObjectStore(STORE_FILES)
      }
      if (!db.objectStoreNames.contains(STORE_NAV_SNAPSHOTS)) {
        db.createObjectStore(STORE_NAV_SNAPSHOTS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_SCHEDULE_DOCS)) {
        db.createObjectStore(STORE_SCHEDULE_DOCS, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STORE_PRINT)) {
        db.createObjectStore(STORE_PRINT, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('IndexedDB'))
  })
}

function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const req = tx.objectStore(storeName).get(key)
        req.onsuccess = () => resolve((req.result as T | undefined) ?? null)
        req.onerror = () => reject(req.error ?? new Error('IndexedDB read'))
      }),
  )
}

function idbGetAll<T>(storeName: string): Promise<T[]> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readonly')
        const req = tx.objectStore(storeName).getAll()
        req.onsuccess = () => resolve((req.result as T[]) ?? [])
        req.onerror = () => reject(req.error ?? new Error('IndexedDB readAll'))
      }),
  )
}

function idbPutKey(storeName: string, key: string, value: unknown): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write'))
        tx.objectStore(storeName).put(value, key)
      }),
  )
}

function idbPut<T>(storeName: string, value: T): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB write'))
        tx.objectStore(storeName).put(value)
      }),
  )
}

function idbDelete(storeName: string, key: string): Promise<void> {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const tx = db.transaction(storeName, 'readwrite')
        tx.oncomplete = () => resolve()
        tx.onerror = () => reject(tx.error ?? new Error('IndexedDB delete'))
        tx.objectStore(storeName).delete(key)
      }),
  )
}

export async function idbGetFile<T>(key: string): Promise<T | null> {
  return idbGet<T>(STORE_FILES, key)
}

export async function idbSetFile(key: string, value: unknown): Promise<void> {
  return idbPutKey(STORE_FILES, key, value)
}

export async function listNavPlanSnapshots(): Promise<NavPlanSnapshot[]> {
  const rows = await idbGetAll<NavPlanSnapshot>(STORE_NAV_SNAPSHOTS)
  return rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function saveNavPlanSnapshot(
  store: PlanningStore,
  label: string,
  note?: string,
  savedBy?: string,
): Promise<NavPlanSnapshot> {
  const existing = await listNavPlanSnapshots()
  const version = (existing[0]?.version ?? 0) + 1
  const snapshot: NavPlanSnapshot = {
    id: newId('nps'),
    version,
    label: label.trim() || `Версія ${version}`,
    savedAt: new Date().toISOString(),
    savedBy: savedBy?.trim() || ensureEditorName(),
    note: note?.trim() || undefined,
    sourceFileName: store.navPlanSource,
    columnsVersion: store.navPlanColumnsVersion ?? 2,
    rowCount: store.navPlan.length,
    payload: {
      navPlan: store.navPlan.map((row) => normalizeNavPlanRow(row)),
      groups: structuredClone(store.groups),
      roomRules: structuredClone(store.roomRules),
      teacherPrefs: structuredClone(store.teacherPrefs),
      subjectPrefs: structuredClone(store.subjectPrefs),
      navPlanSource: store.navPlanSource,
      navPlanColumnsVersion: store.navPlanColumnsVersion ?? 2,
    },
  }
  await idbPut(STORE_NAV_SNAPSHOTS, snapshot)
  return snapshot
}

export async function loadNavPlanSnapshot(id: string): Promise<NavPlanSnapshot | null> {
  return idbGet<NavPlanSnapshot>(STORE_NAV_SNAPSHOTS, id)
}

export async function deleteNavPlanSnapshot(id: string): Promise<void> {
  await idbDelete(STORE_NAV_SNAPSHOTS, id)
}

export async function listScheduleDocuments(): Promise<ScheduleDocument[]> {
  const rows = await idbGetAll<ScheduleDocument>(STORE_SCHEDULE_DOCS)
  return rows.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function saveScheduleDocument(
  schedule: ScheduleData,
  label: string,
  options?: {
    note?: string
    savedBy?: string
    navPlanSnapshotId?: string
    edited?: boolean
    stats?: ScheduleDocument['stats']
  },
): Promise<ScheduleDocument> {
  const doc: ScheduleDocument = {
    id: newId('sch'),
    label: label.trim() || `Розклад ${new Date().toLocaleDateString('uk-UA')}`,
    savedAt: new Date().toISOString(),
    savedBy: options?.savedBy?.trim() || ensureEditorName(),
    note: options?.note?.trim() || undefined,
    schedule: structuredClone(schedule),
    navPlanSnapshotId: options?.navPlanSnapshotId,
    edited: options?.edited ?? false,
    stats: options?.stats ?? {
      groups: schedule.groups.length,
      entries: schedule.entries.length,
      conflicts: 0,
    },
  }
  await idbPut(STORE_SCHEDULE_DOCS, doc)
  return doc
}

export async function loadScheduleDocument(id: string): Promise<ScheduleDocument | null> {
  return idbGet<ScheduleDocument>(STORE_SCHEDULE_DOCS, id)
}

export async function deleteScheduleDocument(id: string): Promise<void> {
  await idbDelete(STORE_SCHEDULE_DOCS, id)
}

export async function listPrintSchedules(kind?: PrintScheduleDocument['kind']): Promise<PrintScheduleDocument[]> {
  const rows = await idbGetAll<PrintScheduleDocument>(STORE_PRINT)
  const filtered = kind ? rows.filter((row) => row.kind === kind) : rows
  return filtered.sort((a, b) => b.savedAt.localeCompare(a.savedAt))
}

export async function savePrintSchedule(doc: PrintScheduleDocument): Promise<void> {
  await idbPut(STORE_PRINT, doc)
}

export async function deletePrintSchedule(id: string): Promise<void> {
  await idbDelete(STORE_PRINT, id)
}

export async function loadPrintSchedule(id: string): Promise<PrintScheduleDocument | null> {
  return idbGet<PrintScheduleDocument>(STORE_PRINT, id)
}
