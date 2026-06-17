import type { EnrichedEntry } from '../types/schedule'
import { parallelSubjectKey } from './parallelSubgroups'

export function clusterKeyForGroup(entry: EnrichedEntry): string {
  if (entry.parallelBundleId) return `b|${entry.parallelBundleId}|${entry.slotId}`
  return `g|${entry.groupId}|${entry.slotId}|${parallelSubjectKey(entry.subject)}`
}

export function parallelDisplaySubject(entries: EnrichedEntry[]): string {
  if (entries.length === 1) return entries[0].subject
  const bases = new Set(entries.map((e) => parallelSubjectKey(e.subject)))
  if (bases.size === 1) {
    return (
      entries[0].subject
        .replace(/\d+\s*ст(?:уд(?:ент(?:ів|и|a)?)?)?\.?/gi, ' ')
        .replace(/\([^)]*\d+\s*ст[^)]*\)/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim() || entries[0].subject
    )
  }
  return entries[0].subject
}

export type ScheduleEntryCluster = {
  key: string
  entries: EnrichedEntry[]
  primary: EnrichedEntry
  parallel: boolean
  teachers: string[]
  rooms: string[]
  subject: string
}

export function clusterEntries(entries: EnrichedEntry[]): ScheduleEntryCluster[] {
  const map = new Map<string, EnrichedEntry[]>()
  for (const entry of entries) {
    const key = clusterKeyForGroup(entry)
    const bucket = map.get(key) ?? []
    bucket.push(entry)
    map.set(key, bucket)
  }

  return [...map.entries()].map(([key, cluster]) => {
    const primary = cluster[0]
    const parallel = cluster.length > 1 || Boolean(primary.parallelBundleId)
    return {
      key,
      entries: cluster,
      primary,
      parallel,
      subject: parallelDisplaySubject(cluster),
      teachers: [...new Set(cluster.map((e) => e.teacher).filter(Boolean))].sort((a, b) =>
        a.localeCompare(b, 'uk'),
      ),
      rooms: [...new Set(cluster.map((e) => e.room).filter(Boolean))],
    }
  })
}

export function shortDisplayText(value: string, max = 22): string {
  const trimmed = value.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max - 1)}…`
}
