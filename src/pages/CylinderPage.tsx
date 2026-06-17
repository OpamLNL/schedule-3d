import { useEffect, useMemo, useState } from 'react'
import demoSchedule from '../data/schedule.json'
import { DetailPanel } from '../components/DetailPanel'
import { DocumentVersionsPanel } from '../components/DocumentVersionsPanel'
import { FilterPanel, defaultScheduleFilters } from '../components/FilterPanel'
import { Legend } from '../components/Legend'
import { ScheduleScene } from '../components/ScheduleScene'
import { ScheduleWeekProjection } from '../components/ScheduleWeekProjection'
import { exportPrintScheduleJson, usePlanning } from '../context/PlanningContext'
import {
  clearCylinderFilters,
  loadCylinderFilters,
  saveCylinderFilters,
} from '../storage/cylinderFilterStorage'
import type { PrintScheduleDocument } from '../types/documents'
import type { Filters, ScheduleData, SelectedCell } from '../types/schedule'
import { enrichEntries, findConflictsForEntry } from '../utils/conflicts'
import { slotLabel } from '../utils/slots'
import {
  navPlanExpectationsForTeacher,
  summarizeExpectationsBySubject,
} from '../utils/navPlanExpectations'
import { normalizeGroupCode } from '../utils/normalize'
import {
  filterEntries,
  filterGroups,
  resolveSingleGroup,
  resolveTeachers,
  teacherMatchesFilter,
} from '../utils/scheduleFilters'

export function CylinderPage() {
  const {
    schedule: generatedSchedule,
    store,
    savePrintScheduleView,
    listPrintScheduleViews,
    deletePrintScheduleView,
    printSavedSchedule,
  } = usePlanning()
  const data = (generatedSchedule ?? demoSchedule) as ScheduleData
  const isGenerated = Boolean(generatedSchedule)

  const [filters, setFilters] = useState<Filters>(() => loadCylinderFilters())
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [hoveredEntryId, setHoveredEntryId] = useState<string | null>(null)
  const [printDocs, setPrintDocs] = useState<PrintScheduleDocument[]>([])

  useEffect(() => {
    saveCylinderFilters(filters)
  }, [filters])

  const refreshPrintDocs = async () => {
    setPrintDocs(await listPrintScheduleViews())
  }

  useEffect(() => {
    void refreshPrintDocs()
  }, [])

  const enrichedEntries = useMemo(() => enrichEntries(data.entries), [data.entries])

  const visibleGroups = useMemo(() => filterGroups(data.groups, filters), [data.groups, filters])

  const visibleGroupIds = useMemo(() => new Set(visibleGroups.map((group) => group.id)), [visibleGroups])

  const visibleEntries = useMemo(
    () => filterEntries(enrichedEntries, data.meta, visibleGroupIds, filters),
    [data.meta, enrichedEntries, filters, visibleGroupIds],
  )

  const conflictCount = visibleEntries.filter((entry) => entry.conflict !== 'none').length

  const matchedTeachers = useMemo(
    () => resolveTeachers(filters.teacher, data.teachers),
    [data.teachers, filters.teacher],
  )

  const teacherProjection = useMemo(() => {
    const q = filters.teacher.trim()
    if (!q) return null
    const entries = enrichedEntries.filter((entry) => teacherMatchesFilter(entry.teacher, q))
    if (entries.length === 0) return null
    const title = matchedTeachers.length === 1 ? matchedTeachers[0]! : q
    return { teacher: title, entries }
  }, [enrichedEntries, filters.teacher, matchedTeachers])

  const weeksByGroup = useMemo(() => {
    const map = new Map<string, number>()
    for (const group of store.groups) map.set(normalizeGroupCode(group.code), group.weeksSpring)
    return map
  }, [store.groups])

  const teacherNavPlanExpectations = useMemo(() => {
    if (!filters.teacher.trim()) return undefined
    const teachers = matchedTeachers.length > 0 ? matchedTeachers : [filters.teacher.trim()]
    const rows = teachers.flatMap((teacher) =>
      navPlanExpectationsForTeacher(store.navPlan, teacher, weeksByGroup),
    )
    return summarizeExpectationsBySubject(rows)
  }, [filters.teacher, matchedTeachers, store.navPlan, weeksByGroup])

  const groupProjection = useMemo(() => {
    const group = resolveSingleGroup(data.groups, filters.groupCode)
    if (!group) return null
    return {
      group,
      entries: enrichedEntries.filter((entry) => entry.groupId === group.id),
    }
  }, [data.groups, enrichedEntries, filters.groupCode])

  const teacherProjectionForScene =
    teacherProjection === null
      ? null
      : {
          teacher: teacherProjection.teacher,
          entries: teacherProjection.entries,
          groups: data.groups,
        }

  const selectedCell = useMemo<SelectedCell | null>(() => {
    if (!selectedEntryId) return null
    const entry = data.entries.find((item) => item.id === selectedEntryId)
    if (!entry) return null
    const group = data.groups.find((item) => item.id === entry.groupId)
    if (!group) return null

    return {
      entry,
      group,
      slotLabel: slotLabel(entry.slotId, data.meta),
      conflicts: findConflictsForEntry(entry, data.entries),
    }
  }, [data.entries, data.groups, data.meta, selectedEntryId])

  const showSidebarHint = !teacherProjection && !groupProjection

  const saveCurrentPrintView = async () => {
    if (teacherProjection) {
      await savePrintScheduleView(
        'teacher',
        teacherProjection.teacher,
        teacherProjection.teacher,
        teacherProjection.entries,
      )
    } else if (groupProjection) {
      await savePrintScheduleView(
        'group',
        groupProjection.group.code,
        `Група ${groupProjection.group.code}`,
        groupProjection.entries,
      )
    }
    await refreshPrintDocs()
  }

  return (
    <div className="cylinder-layout">
      <header className="app-header cylinder-header">
        <div className="cylinder-header-top">
          <div>
            <p className="eyebrow">3D-інтерфейс</p>
            <h1>Циліндр занять</h1>
            <p className="subtitle">
              {isGenerated
                ? `Весняний розклад · ${data.groups.length} груп · ${data.entries.length} пар`
                : 'Демо-розклад. Зберіть весняний розклад на вкладці «Розклад».'}
            </p>
          </div>
          <Legend />
        </div>

        <FilterPanel
          filters={filters}
          visibleGroups={visibleGroups}
          visibleEntriesCount={visibleEntries.length}
          conflictCount={conflictCount}
          onChange={(patch) => setFilters((current) => ({ ...current, ...patch }))}
          onReset={() => {
            clearCylinderFilters()
            setFilters(defaultScheduleFilters)
          }}
        />

        <DetailPanel selected={selectedCell} layout="bar" groups={data.groups} />
      </header>

      <main className="layout cylinder-main">
        <section className="viewport cylinder-viewport">
          <ScheduleScene
            groups={visibleGroups}
            entries={visibleEntries}
            meta={data.meta}
            selectedEntryId={selectedEntryId}
            hoveredEntryId={hoveredEntryId}
            onSelect={setSelectedEntryId}
            onHover={setHoveredEntryId}
            teacherProjection={teacherProjectionForScene}
          />
          <div className="viewport-hint">ЛКМ — обертання · колесо — масштаб · ПКМ — зсув</div>
        </section>

        <aside className="cylinder-sidebar panel">
          <h2 className="cylinder-sidebar-title">Тижневий розклад</h2>
          {showSidebarHint ? (
            <p className="muted cylinder-sidebar-hint">
              Введіть викладача або точний код групи у фільтрах зверху — тут з’явиться розклад по днях.
            </p>
          ) : null}
          {teacherProjection ? (
            <ScheduleWeekProjection
              title={teacherProjection.teacher}
              entries={teacherProjection.entries}
              groups={data.groups}
              meta={data.meta}
              mode="teacher"
              expectedBySubject={teacherNavPlanExpectations}
            />
          ) : null}
          {groupProjection ? (
            <ScheduleWeekProjection
              title={`Група ${groupProjection.group.code}`}
              entries={groupProjection.entries}
              groups={data.groups}
              meta={data.meta}
              mode="group"
            />
          ) : null}

          {teacherProjection || groupProjection ? (
            <div className="cylinder-print-actions">
              <button type="button" className="btn" onClick={() => void saveCurrentPrintView()}>
                Зберегти для друку
              </button>
            </div>
          ) : null}

          <DocumentVersionsPanel
            kind="print"
            items={printDocs}
            onRefresh={refreshPrintDocs}
            onDelete={deletePrintScheduleView}
            onPrint={(item) => void printSavedSchedule(item.id)}
            onExport={exportPrintScheduleJson}
          />
        </aside>
      </main>
    </div>
  )
}
