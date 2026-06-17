import type { PlanningStore } from './planning'
import type { ScheduleData, ScheduleEntry, ScheduleMeta } from './schedule'

export type NavPlanSnapshot = {
  id: string
  version: number
  label: string
  savedAt: string
  savedBy: string
  note?: string
  sourceFileName?: string
  columnsVersion: number
  rowCount: number
  payload: Pick<
    PlanningStore,
    'navPlan' | 'groups' | 'roomRules' | 'teacherPrefs' | 'subjectPrefs' | 'navPlanSource' | 'navPlanColumnsVersion'
  >
}

export type ScheduleDocument = {
  id: string
  label: string
  savedAt: string
  savedBy: string
  note?: string
  schedule: ScheduleData
  navPlanSnapshotId?: string
  edited: boolean
  stats: {
    groups: number
    entries: number
    conflicts: number
  }
}

export type PrintScheduleKind = 'group' | 'teacher'

export type PrintWeekRow = {
  slot: string
  period: number
  subject: string
  teacher: string
  room: string
  groupCode: string
  parallel: boolean
  teachers?: string[]
  hasConflict?: boolean
}

export type PrintScheduleDocument = {
  id: string
  kind: PrintScheduleKind
  targetName: string
  title: string
  savedAt: string
  savedBy: string
  note?: string
  scheduleDocumentId?: string
  meta: ScheduleMeta
  entries: ScheduleEntry[]
  weeks: Array<{ day: string; rows: PrintWeekRow[] }>
}
