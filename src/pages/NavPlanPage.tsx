import { useEffect, useMemo, useRef, useState } from 'react'
import { AppLayout, SaveToolbar, type AppPage } from '../components/AppLayout'
import { DocumentVersionsPanel } from '../components/DocumentVersionsPanel'
import { NavPlanFiltersPanel } from '../components/NavPlanFiltersPanel'
import { NavPlanClassifyBar } from '../components/NavPlanClassifyBar'
import { NavPlanTable, navPlanNeedsReimport } from '../components/NavPlanTable'
import { exportNavPlanSnapshotJson, usePlanning } from '../context/PlanningContext'
import type { NavPlanSnapshot } from '../types/documents'
import { reparseNavPlanFromStoredFile, saveNavPlanSourceFile } from '../storage/navPlanFileStorage'
import { savePlanningStore } from '../storage/planningStorage'
import type { NavPlanRow } from '../types/planning'
import { newId, normalizeGroupCode, normalizeSubjectKey, normalizeTeacherField } from '../utils/normalize'
import { defaultNavPlanFilters, filterNavPlanRows } from '../utils/navPlanFilters'
import { classifyNavPlanRow } from '../utils/navPlanClassify'
import { parseNavPlanFile } from '../utils/parseNavPlan'

type PageProps = { page: AppPage; onPageChange: (page: AppPage) => void }

export function NavPlanPage({ page, onPageChange }: PageProps) {
  const {
    store,
    setStore,
    saveLocal,
    status,
    setStatus,
    saveNavPlanVersion,
    restoreNavPlanVersion,
    listNavPlanVersions,
    deleteNavPlanVersion,
    exportCurrentNavPlanJson,
    importNavPlanJson,
  } = usePlanning()
  const [filters, setFilters] = useState(defaultNavPlanFilters)
  const [importError, setImportError] = useState<string | null>(null)
  const [navSnapshots, setNavSnapshots] = useState<NavPlanSnapshot[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const refreshSnapshots = async () => {
    setNavSnapshots(await listNavPlanVersions())
  }

  const filteredRows = useMemo(
    () => filterNavPlanRows(store.navPlan, filters),
    [store.navPlan, filters],
  )

  const groupOptions = useMemo(() => {
    const codes = [...new Set(store.navPlan.map((r) => r.groupCode))].sort()
    return codes
  }, [store.navPlan])

  const needsReimport =
    store.navPlan.length > 0 &&
    (store.navPlanColumnsVersion !== 2 || navPlanNeedsReimport(store.navPlan))

  const applyImportedRows = (rows: NavPlanRow[], source: string) => {
    setStore((current) => {
      const next = {
        ...current,
        navPlan: rows,
        navPlanSource: source,
        navPlanColumnsVersion: 2,
      }
      savePlanningStore(next)
      return next
    })
  }

  useEffect(() => {
    if (!needsReimport) return
    let cancelled = false
    reparseNavPlanFromStoredFile().then((parsed) => {
      if (cancelled || !parsed?.rows.length) return
      applyImportedRows(parsed.rows, parsed.source)
      setStatus(`Години оновлено з ${parsed.source}`)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const refreshFromStoredExcel = async () => {
    setImportError(null)
    const parsed = await reparseNavPlanFromStoredFile()
    if (!parsed?.rows.length) {
      fileRef.current?.click()
      return
    }
    applyImportedRows(parsed.rows, parsed.source)
    setStatus(`Оновлено ${parsed.rows.length} рядків · ${parsed.source}`)
  }

  const updateRow = (id: string, key: keyof NavPlanRow, value: string | number) => {
    setStore((current) => ({
      ...current,
      navPlan: current.navPlan.map((row) => {
        if (row.id !== id) return row
        const next = { ...row, [key]: value }
        if (key === 'subject') {
          next.subjectNorm = normalizeSubjectKey(String(value))
          const classified = classifyNavPlanRow(next)
          next.planKind = classified.kind
          next.planKindLabel = classified.label
        }
        if (key === 'teacher') next.teacher = normalizeTeacherField(String(value))
        if (key === 'groupCode') next.groupCode = normalizeGroupCode(String(value))
        return next
      }),
    }))
  }

  const deleteRow = (id: string) => {
    setStore((current) => ({
      ...current,
      navPlan: current.navPlan.filter((row) => row.id !== id),
    }))
  }

  const addRow = () => {
    setStore((current) => ({
      ...current,
      navPlan: [
        ...current.navPlan,
        {
          id: newId('np'),
          subject: '',
          subjectNorm: '',
          teacher: '',
          hoursTotal: 0,
          hoursCourse: 0,
          hoursSelf: 0,
          fallLectures: 0,
          fallPractical: 0,
          fallLab: 0,
          fallCoursework: 0,
          fallConsult: 0,
          fallCredits: 0,
          fallExams: 0,
          hoursFall: 0,
          springLectures: 0,
          springPractical: 0,
          springLab: 0,
          springCoursework: 0,
          springConsult: 0,
          springSupervised: 0,
          springCredits: 0,
          springExams: 0,
          springDpa: 0,
          springDkk: 0,
          hoursSpring: 0,
          groupCode: groupOptions[0] ?? '',
          budget: 0,
          extraBudget: 0,
          planKind: 'schedule',
          planKindLabel: 'У тижневий розклад',
        },
      ],
    }))
  }

  const onFile = async (file: File | undefined) => {
    if (!file) return
    setImportError(null)
    try {
      const rows = await parseNavPlanFile(file)
      if (rows.length === 0) throw new Error('Не знайдено рядків навплану')
      await saveNavPlanSourceFile(file)
      applyImportedRows(rows, file.name)
      setStatus(`Завантажено ${rows.length} рядків · збережено локально`)
    } catch (err) {
      setImportError(err instanceof Error ? err.message : 'Помилка імпорту')
    } finally {
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const toolbar = (
    <SaveToolbar
      onSaveLocal={saveLocal}
      extra={
        <>
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls"
            hidden
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
            Завантажити Excel
          </button>
          {store.navPlan.length > 0 ? (
            <button type="button" className="btn" onClick={refreshFromStoredExcel}>
              Оновити години
            </button>
          ) : null}
          <button type="button" className="btn" onClick={addRow}>
            + Рядок
          </button>
        </>
      }
    />
  )

  return (
    <AppLayout
      page={page}
      onPageChange={onPageChange}
      title="Навчальний план"
      subtitle={
        store.navPlanSource
          ? `Джерело: ${store.navPlanSource}. Показано ${filteredRows.length} з ${store.navPlan.length}. За замовчуванням — лише пари для розкладу; КР/КП/практики — у «Виключені».`
          : 'Завантажте Excel. Рядки автоматично класифікуються: пари, КР, КП, практики…'
      }
      toolbar={toolbar}
      status={status}
    >
      {importError ? <p className="error-banner">{importError}</p> : null}
      {needsReimport ? (
        <p className="warn-banner">
          У таблиці лише старі дані (без лекцій, практичних, заліків). Натисніть{' '}
          <strong>Оновити години</strong> або завантажте Excel знову — тоді з’являться всі колонки
          годин, як у файлі.
        </p>
      ) : null}

      <DocumentVersionsPanel
        kind="navPlan"
        items={navSnapshots}
        onRefresh={refreshSnapshots}
        canExportCurrent={store.navPlan.length > 0}
        onSave={async (label, note) => {
          await saveNavPlanVersion(label, note)
        }}
        onRestore={restoreNavPlanVersion}
        onDelete={deleteNavPlanVersion}
        onExport={exportNavPlanSnapshotJson}
        onExportCurrent={(label, note) => exportCurrentNavPlanJson(label, note)}
        onImport={async (file) => {
          setImportError(null)
          try {
            await importNavPlanJson(file)
            await refreshSnapshots()
          } catch (err) {
            setImportError(err instanceof Error ? err.message : 'Помилка імпорту JSON')
          }
        }}
      />

      {store.navPlan.length > 0 ? (
        <>
          <NavPlanClassifyBar
            rows={store.navPlan}
            active={filters.planKind}
            onSelect={(planKind) => setFilters((current) => ({ ...current, planKind }))}
          />
          <NavPlanFiltersPanel filters={filters} onChange={setFilters} />
        </>
      ) : null}
      <NavPlanTable
        rows={filteredRows}
        onChange={updateRow}
        onDelete={deleteRow}
        emptyText="Завантажте навплан з Excel (.xlsx)"
      />
    </AppLayout>
  )
}
