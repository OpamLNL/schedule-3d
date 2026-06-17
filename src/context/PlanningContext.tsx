import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { NavPlanSnapshot, PrintScheduleDocument, ScheduleDocument } from '../types/documents'
import type { PlanningStore } from '../types/planning'
import type { ScheduleData, ScheduleEntry } from '../types/schedule'
import {
  deleteNavPlanSnapshot,
  deletePrintSchedule,
  deleteScheduleDocument,
  listNavPlanSnapshots,
  listPrintSchedules,
  listScheduleDocuments,
  loadNavPlanSnapshot,
  loadPrintSchedule,
  loadScheduleDocument,
  saveNavPlanSnapshot,
  savePrintSchedule,
  saveScheduleDocument,
} from '../storage/documentStorage'
import { loadPlanningStore, savePlanningStore } from '../storage/planningStorage'
import { loadGeneratedSchedule, saveGeneratedSchedule } from '../storage/scheduleStorage'
import { buildSpringScheduleAsync, type ScheduleBuildProgress, type SpringScheduleResult } from '../scheduler/springScheduler'
import { enrichEntries } from '../utils/conflicts'
import { syncPlanningGroupsFromNavPlan } from '../utils/groupDefaults'
import { newId } from '../utils/normalize'
import { downloadJsonFile, createPrintScheduleDocument, printScheduleDocumentHtml } from '../utils/schedulePrintExport'
import {
  applyNavPlanImport,
  buildNavPlanExport,
  exportNavPlanDocumentFile,
  parseNavPlanImport,
  snapshotToExportDocument,
} from '../utils/navPlanJsonExchange'
import { parseImportJsonText, readImportFileText } from '../utils/jsonImportText'
import {
  exportCurrentScheduleJson as exportCurrentScheduleJsonFile,
  exportCurrentScheduleTxt as exportCurrentScheduleTxtFile,
  parseScheduleImport,
} from '../utils/scheduleJsonExchange'
import { ensureEditorName } from '../storage/editorIdentity'

export type ScheduleBuildState = {
  running: boolean
  progress: number
  stage: string
  detail: string | null
  lastResult: SpringScheduleResult | null
  error: string | null
}

const idleBuildState: ScheduleBuildState = {
  running: false,
  progress: 0,
  stage: '',
  detail: null,
  lastResult: null,
  error: null,
}

type PlanningContextValue = {
  store: PlanningStore
  setStore: React.Dispatch<React.SetStateAction<PlanningStore>>
  schedule: ScheduleData | null
  scheduleEdited: boolean
  scheduleBuild: ScheduleBuildState
  generateSpringSchedule: () => Promise<SpringScheduleResult | null>
  updateScheduleEntry: (entryId: string, patch: Partial<ScheduleEntry>) => void
  saveCurrentSchedule: (label?: string, note?: string) => Promise<ScheduleDocument | null>
  loadScheduleVersion: (id: string) => Promise<void>
  listScheduleVersions: () => Promise<ScheduleDocument[]>
  deleteScheduleVersion: (id: string) => Promise<void>
  saveNavPlanVersion: (label: string, note?: string) => Promise<NavPlanSnapshot>
  restoreNavPlanVersion: (id: string) => Promise<void>
  listNavPlanVersions: () => Promise<NavPlanSnapshot[]>
  deleteNavPlanVersion: (id: string) => Promise<void>
  exportCurrentNavPlanJson: (label?: string, note?: string) => void
  importNavPlanJson: (file: File) => Promise<void>
  importNavPlanJsonText: (text: string) => Promise<void>
  importScheduleJson: (file: File) => Promise<void>
  importScheduleJsonText: (text: string) => Promise<void>
  exportCurrentScheduleJson: (label?: string, note?: string) => void
  exportCurrentScheduleTxt: (label?: string, note?: string) => void
  savePrintScheduleView: (
    kind: 'group' | 'teacher',
    targetName: string,
    title: string,
    entries: ScheduleEntry[],
    note?: string,
  ) => Promise<PrintScheduleDocument>
  listPrintScheduleViews: (kind?: 'group' | 'teacher') => Promise<PrintScheduleDocument[]>
  deletePrintScheduleView: (id: string) => Promise<void>
  printSavedSchedule: (id: string) => Promise<void>
  printScheduleView: (
    kind: 'group' | 'teacher',
    targetName: string,
    title: string,
    entries: ScheduleEntry[],
    note?: string,
  ) => void
  saveLocal: () => void
  status: string | null
  setStatus: (message: string | null) => void
}

const PlanningContext = createContext<PlanningContextValue | null>(null)

function scheduleStats(schedule: ScheduleData) {
  const enriched = enrichEntries(schedule.entries)
  return {
    groups: schedule.groups.length,
    entries: schedule.entries.length,
    conflicts: enriched.filter((entry) => entry.conflict !== 'none').length,
  }
}

export function PlanningProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<PlanningStore>(() => loadPlanningStore())
  const [schedule, setSchedule] = useState<ScheduleData | null>(() => loadGeneratedSchedule())
  const [scheduleEdited, setScheduleEdited] = useState(false)
  const [scheduleBuild, setScheduleBuild] = useState<ScheduleBuildState>(idleBuildState)
  const [status, setStatus] = useState<string | null>(null)
  const skipAutoSave = useRef(true)

  useEffect(() => {
    if (skipAutoSave.current) {
      skipAutoSave.current = false
      return
    }
    const timer = window.setTimeout(() => {
      savePlanningStore(store)
    }, 500)
    return () => window.clearTimeout(timer)
  }, [store])

  const persistSchedule = useCallback((next: ScheduleData, edited: boolean) => {
    setSchedule(next)
    setScheduleEdited(edited)
    saveGeneratedSchedule(next)
  }, [])

  const generateSpringSchedule = useCallback(async () => {
    if (scheduleBuild.running) return null

    setScheduleBuild({
      running: true,
      progress: 0,
      stage: 'Запуск…',
      detail: null,
      lastResult: null,
      error: null,
    })
    setStatus('Збираємо весняний розклад…')

    const onProgress = (p: ScheduleBuildProgress) => {
      setScheduleBuild((current) => ({
        ...current,
        running: true,
        progress: p.percent,
        stage: p.stage,
        detail: p.detail ?? null,
      }))
      setStatus(p.detail ? `${p.stage} · ${p.detail}` : p.stage)
    }

    try {
      const syncedStore = syncPlanningGroupsFromNavPlan(store)
      const result = await buildSpringScheduleAsync(syncedStore, onProgress)
      setStore(syncedStore)
      savePlanningStore(syncedStore)
      persistSchedule(result.schedule, false)
      setScheduleBuild({
        running: false,
        progress: 100,
        stage: 'Готово',
        detail: `${result.placed} з ${result.requested} пар`,
        lastResult: result,
        error: null,
      })
      setStatus(
        result.unplaced.length
          ? `Готово: ${result.placed} з ${result.requested} пар · ${result.unplaced.length} не вмістилось`
          : `Готово: ${result.placed} пар · ${syncedStore.groups.length} груп`,
      )
      return result
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Помилка збірки розкладу'
      setScheduleBuild({
        running: false,
        progress: 0,
        stage: 'Помилка',
        detail: message,
        lastResult: null,
        error: message,
      })
      setStatus(message)
      return null
    }
  }, [store, scheduleBuild.running, persistSchedule])

  const updateScheduleEntry = useCallback(
    (entryId: string, patch: Partial<ScheduleEntry>) => {
      setSchedule((current) => {
        if (!current) return current
        const next: ScheduleData = {
          ...current,
          entries: current.entries.map((entry) => (entry.id === entryId ? { ...entry, ...patch } : entry)),
        }
        saveGeneratedSchedule(next)
        setScheduleEdited(true)
        return next
      })
    },
    [],
  )

  const saveCurrentSchedule = useCallback(async (label?: string, note?: string) => {
    if (!schedule) return null
    const resolvedLabel =
      label?.trim() ||
      window.prompt('Назва збереженого розкладу:', `Розклад ${new Date().toLocaleDateString('uk-UA')}`)?.trim() ||
      `Розклад ${new Date().toLocaleDateString('uk-UA')}`
    const resolvedNote =
      note !== undefined
        ? note.trim() || undefined
        : window.prompt('Примітка (необовʼязково):', '')?.trim() || undefined
    const doc = await saveScheduleDocument(schedule, resolvedLabel, {
      note: resolvedNote,
      edited: scheduleEdited,
      stats: scheduleStats(schedule),
    })
    setStatus(`Розклад збережено: ${doc.label}`)
    return doc
  }, [schedule, scheduleEdited])

  const loadScheduleVersion = useCallback(
    async (id: string) => {
      const doc = await loadScheduleDocument(id)
      if (!doc) {
        setStatus('Версію розкладу не знайдено')
        return
      }
      persistSchedule(doc.schedule, doc.edited)
      setStatus(`Завантажено розклад «${doc.label}» · ${doc.savedBy}`)
    },
    [persistSchedule],
  )

  const saveNavPlanVersion = useCallback(
    async (label: string, note?: string) => {
      const snapshot = await saveNavPlanSnapshot(store, label, note)
      setStatus(`Навплан збережено: v${snapshot.version} · ${snapshot.label}`)
      return snapshot
    },
    [store],
  )

  const restoreNavPlanVersion = useCallback(async (id: string) => {
    const snapshot = await loadNavPlanSnapshot(id)
    if (!snapshot) {
      setStatus('Версію навплану не знайдено')
      return
    }
    const next: PlanningStore = {
      ...store,
      ...snapshot.payload,
      navPlan: snapshot.payload.navPlan.map((row) => ({ ...row })),
    }
    setStore(next)
    savePlanningStore(next)
    setStatus(`Завантажено навплан v${snapshot.version} · ${snapshot.label} (${snapshot.savedBy})`)
  }, [store])

  const exportCurrentNavPlanJson = useCallback(
    (label?: string, note?: string) => {
      if (store.navPlan.length === 0) {
        setStatus('Немає даних навплану для експорту')
        return
      }
      const doc = buildNavPlanExport(store, { label, note })
      exportNavPlanDocumentFile(doc)
      setStatus(
        `Експорт JSON · ${doc.rowCount} рядків · ${doc.savedBy} · ${new Date(doc.savedAt).toLocaleString('uk-UA')}`,
      )
    },
    [store],
  )

  const importNavPlanJsonText = useCallback(
    async (text: string, fileLabel?: string) => {
      const parsed = parseImportJsonText(text, fileLabel)
      const doc = parseNavPlanImport(parsed)
      if (doc.payload.navPlan.length === 0) throw new Error('У JSON немає рядків навплану')
      const next = applyNavPlanImport(store, doc)
      setStore(next)
      savePlanningStore(next)
      setStatus(
        `Імпорт JSON · ${doc.rowCount} рядків · «${doc.label}» · ${doc.savedBy} · ${new Date(doc.savedAt).toLocaleString('uk-UA')}`,
      )
    },
    [store],
  )

  const importNavPlanJson = useCallback(
    async (file: File) => {
      const text = await readImportFileText(file)
      await importNavPlanJsonText(text, file.name)
    },
    [importNavPlanJsonText],
  )

  const importScheduleJsonText = useCallback(
    async (text: string, fileLabel?: string) => {
      const parsed = parseImportJsonText(text, fileLabel)
      const doc = parseScheduleImport(parsed)
      if (doc.schedule.groups.length === 0) throw new Error('У JSON немає груп')
      persistSchedule(doc.schedule, doc.edited)
      await saveScheduleDocument(doc.schedule, doc.label, {
        note: doc.note,
        edited: doc.edited,
      })
      setStatus(
        `Імпорт успішний · ${doc.schedule.groups.length} груп · ${doc.schedule.entries.length} пар · «${doc.label}» · прокрутіть вгору до «Результат» або «Відкрити 3D»`,
      )
    },
    [persistSchedule],
  )

  const importScheduleJson = useCallback(
    async (file: File) => {
      const text = await readImportFileText(file)
      await importScheduleJsonText(text, file.name)
    },
    [importScheduleJsonText],
  )

  const exportCurrentScheduleJson = useCallback(
    (label?: string, note?: string) => {
      if (!schedule) {
        setStatus('Немає активного розкладу для експорту')
        return
      }
      exportCurrentScheduleJsonFile(schedule, { label, note })
      setStatus(
        `Експорт JSON · ${schedule.groups.length} груп · ${schedule.entries.length} пар · ${new Date().toLocaleString('uk-UA')}`,
      )
    },
    [schedule],
  )

  const exportCurrentScheduleTxt = useCallback(
    (label?: string, note?: string) => {
      if (!schedule) {
        setStatus('Немає активного розкладу для експорту')
        return
      }
      exportCurrentScheduleTxtFile(schedule, { label, note })
      setStatus(
        `Експорт TXT · ${schedule.groups.length} груп · ${schedule.entries.length} пар · для Android · ${new Date().toLocaleString('uk-UA')}`,
      )
    },
    [schedule],
  )

  const savePrintScheduleView = useCallback(
    async (
      kind: 'group' | 'teacher',
      targetName: string,
      title: string,
      entries: ScheduleEntry[],
      note?: string,
    ) => {
      if (!schedule) throw new Error('Немає активного розкладу')
      const doc: PrintScheduleDocument = {
        ...createPrintScheduleDocument(
          schedule,
          kind,
          targetName,
          title,
          entries,
          ensureEditorName(),
          note,
        ),
        id: newId('prt'),
      }
      await savePrintSchedule(doc)
      setStatus(`Збережено для друку: ${title}`)
      return doc
    },
    [schedule],
  )

  const printSavedSchedule = useCallback(async (id: string) => {
    const doc = await loadPrintSchedule(id)
    if (!doc) {
      setStatus('Друковану версію не знайдено')
      return
    }
    printScheduleDocumentHtml(doc)
    setStatus(`Друк: ${doc.title}`)
  }, [])

  const printScheduleView = useCallback(
    (
      kind: 'group' | 'teacher',
      targetName: string,
      title: string,
      entries: ScheduleEntry[],
      note?: string,
    ) => {
      if (!schedule) {
        setStatus('Спочатку зберіть або згенеруйте розклад')
        return
      }
      const doc = createPrintScheduleDocument(
        schedule,
        kind,
        targetName,
        title,
        entries,
        ensureEditorName(),
        note,
      )
      printScheduleDocumentHtml(doc)
      setStatus(`Друк: ${title}`)
    },
    [schedule],
  )

  const saveLocal = useCallback(() => {
    savePlanningStore(store)
    setStatus('Збережено локально')
  }, [store])

  const value = useMemo(
    () => ({
      store,
      setStore,
      schedule,
      scheduleEdited,
      scheduleBuild,
      generateSpringSchedule,
      updateScheduleEntry,
      saveCurrentSchedule,
      loadScheduleVersion: loadScheduleVersion,
      listScheduleVersions: listScheduleDocuments,
      deleteScheduleVersion: deleteScheduleDocument,
      saveNavPlanVersion,
      restoreNavPlanVersion,
      listNavPlanVersions: listNavPlanSnapshots,
      deleteNavPlanVersion: deleteNavPlanSnapshot,
      exportCurrentNavPlanJson,
      importNavPlanJson,
      importNavPlanJsonText,
      importScheduleJson,
      importScheduleJsonText,
      exportCurrentScheduleJson,
      exportCurrentScheduleTxt,
      savePrintScheduleView,
      listPrintScheduleViews: listPrintSchedules,
      deletePrintScheduleView: deletePrintSchedule,
      printSavedSchedule,
      printScheduleView,
      saveLocal,
      status,
      setStatus,
    }),
    [
      store,
      schedule,
      scheduleEdited,
      scheduleBuild,
      generateSpringSchedule,
      updateScheduleEntry,
      saveCurrentSchedule,
      loadScheduleVersion,
      saveNavPlanVersion,
      restoreNavPlanVersion,
      exportCurrentNavPlanJson,
      importNavPlanJson,
      importNavPlanJsonText,
      importScheduleJson,
      importScheduleJsonText,
      exportCurrentScheduleJson,
      exportCurrentScheduleTxt,
      savePrintScheduleView,
      printSavedSchedule,
      printScheduleView,
      saveLocal,
      status,
    ],
  )

  return <PlanningContext.Provider value={value}>{children}</PlanningContext.Provider>
}

export function usePlanning() {
  const ctx = useContext(PlanningContext)
  if (!ctx) throw new Error('usePlanning поза PlanningProvider')
  return ctx
}

export function exportNavPlanSnapshotJson(snapshot: NavPlanSnapshot) {
  exportNavPlanDocumentFile(snapshotToExportDocument(snapshot))
}

export function exportScheduleDocumentJson(doc: ScheduleDocument) {
  downloadJsonFile(doc, `schedule-${doc.label.replace(/\s+/g, '_')}.json`)
}

export function exportPrintScheduleJson(doc: PrintScheduleDocument) {
  downloadJsonFile(doc, `print-${doc.kind}-${doc.targetName.replace(/\s+/g, '_')}.json`)
}
