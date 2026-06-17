import type { ConflictKind, Group, ScheduleEntry } from '../types/schedule'
import { parallelSubjectKey } from './parallelSubgroups'

/** Паралельні підгрупи однієї групи в один слот — не накладка одна на одну. */
export function isParallelPeer(a: ScheduleEntry, b: ScheduleEntry): boolean {
  if (a.id === b.id) return false
  if (a.slotId !== b.slotId) return false

  if (a.parallelBundleId && b.parallelBundleId && a.parallelBundleId === b.parallelBundleId) {
    return true
  }

  return (
    a.groupId === b.groupId &&
    parallelSubjectKey(a.subject) === parallelSubjectKey(b.subject)
  )
}

export function detectEntryConflict(entry: ScheduleEntry, allEntries: ScheduleEntry[]): ConflictKind {
  const teacherConflict = allEntries.some(
    (other) =>
      other.id !== entry.id &&
      !isParallelPeer(entry, other) &&
      other.slotId === entry.slotId &&
      other.teacher === entry.teacher,
  )

  if (teacherConflict) return 'teacher'

  const roomConflict = allEntries.some(
    (other) =>
      other.id !== entry.id &&
      !isParallelPeer(entry, other) &&
      other.slotId === entry.slotId &&
      other.room === entry.room &&
      entry.room !== 'Дист' &&
      other.room !== 'Дист',
  )

  if (roomConflict) return 'room'

  return 'none'
}

export function enrichEntries(entries: ScheduleEntry[]) {
  return entries.map((entry) => ({
    ...entry,
    conflict: detectEntryConflict(entry, entries),
  }))
}

export function findConflictsForEntry(entry: ScheduleEntry, allEntries: ScheduleEntry[]) {
  return allEntries.filter(
    (other) =>
      other.id !== entry.id &&
      !isParallelPeer(entry, other) &&
      other.slotId === entry.slotId &&
      (other.teacher === entry.teacher ||
        (other.room === entry.room && entry.room !== 'Дист' && other.room !== 'Дист')),
  )
}

export type ConflictReason = 'teacher' | 'room' | 'both'

export function conflictReasonBetween(entry: ScheduleEntry, other: ScheduleEntry): ConflictReason {
  const teacher = entry.teacher === other.teacher
  const room =
    entry.room === other.room && entry.room !== 'Дист' && other.room !== 'Дист'

  if (teacher && room) return 'both'
  if (teacher) return 'teacher'
  return 'room'
}

export function conflictReasonLabel(reason: ConflictReason): string {
  if (reason === 'teacher') return 'викладач'
  if (reason === 'room') return 'аудиторія'
  return 'викладач і аудиторія'
}

export function describeConflictEntry(other: ScheduleEntry, groupById: Map<string, Group>): string {
  const code = groupById.get(other.groupId)?.code ?? '?'
  return `${code} · ${other.subject} · ${other.teacher} · ауд. ${other.room}`
}

export type DescribedConflict = {
  entry: ScheduleEntry
  reason: ConflictReason
  reasonLabel: string
  summary: string
}

export function describeConflictWithReason(
  entry: ScheduleEntry,
  other: ScheduleEntry,
  groupById: Map<string, Group>,
): DescribedConflict {
  const reason = conflictReasonBetween(entry, other)
  return {
    entry: other,
    reason,
    reasonLabel: conflictReasonLabel(reason),
    summary: describeConflictEntry(other, groupById),
  }
}

export function describeConflictsForEntry(
  entry: ScheduleEntry,
  allEntries: ScheduleEntry[],
  groupById: Map<string, Group>,
): DescribedConflict[] {
  return findConflictsForEntry(entry, allEntries).map((other) =>
    describeConflictWithReason(entry, other, groupById),
  )
}

export function conflictColor(conflict: ConflictKind, selected: boolean, hovered: boolean) {
  if (conflict === 'teacher') return selected ? '#ff5a5f' : hovered ? '#ff7b7f' : '#d64545'
  if (conflict === 'room') return selected ? '#ffb020' : hovered ? '#ffc857' : '#d8891d'
  return selected ? '#4da3ff' : hovered ? '#66b2ff' : '#3b82c4'
}
