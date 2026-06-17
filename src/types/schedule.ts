export type ScheduleMeta = {
  sourceFile: string
  generatedAt: string
  note: string
  days: string[]
  periodsPerDay: number
  totalSlots: number
}

export type Group = {
  id: string
  code: string
  name: string
  specialty: string
  course: number
  room: string
}

export type Teacher = {
  id: string
  name: string
}

export type Room = {
  id: string
  code: string
}

export type ScheduleEntry = {
  id: string
  groupId: string
  slotId: number
  subject: string
  teacher: string
  room: string
  /** Паралельні підгрупи однієї групи в один слот */
  parallelBundleId?: string
}

export type ConflictKind = 'teacher' | 'room' | 'none'

export type ScheduleData = {
  meta: ScheduleMeta
  groups: Group[]
  teachers: Teacher[]
  rooms: Room[]
  entries: ScheduleEntry[]
}

export type EnrichedEntry = ScheduleEntry & {
  conflict: ConflictKind
}

export type SelectedCell = {
  entry: ScheduleEntry
  group: Group
  slotLabel: string
  conflicts: ScheduleEntry[]
}

export type Filters = {
  specialty: string
  course: string
  groupCode: string
  teacher: string
  day: string
  conflictsOnly: boolean
}
