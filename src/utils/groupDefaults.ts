import type { GroupRow, PlanningStore } from '../types/planning'
import { parseGroupCode, type ParsedGroupCode } from './groupCode'
import { newId, normalizeGroupCode } from './normalize'

/** Умовна аудиторія для групи без явного призначення. */
export function placeholderRoom(code: string, parsed?: ParsedGroupCode): string {
  const p = parsed ?? parseGroupCode(code)
  let hash = 0
  for (const ch of code) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  const num = 200 + (hash % 350)
  return `~${p.specialty}${p.course}${p.subgroup}.${num}`
}

export function defaultWeeksSpring(parsed: ParsedGroupCode): number {
  if (parsed.course >= 4) return 9
  if (parsed.course === 3) return 16
  return 18
}

export function createGroupRowFromCode(code: string, existing?: GroupRow): GroupRow {
  const normalized = normalizeGroupCode(code)
  const parsed = parseGroupCode(normalized)
  return {
    id: existing?.id ?? newId('g'),
    code: normalized,
    weeksFall: existing?.weeksFall ?? 14,
    weeksSpring: existing?.weeksSpring ?? defaultWeeksSpring(parsed),
    room:
      existing?.room && !existing.room.startsWith('~') ? existing.room : placeholderRoom(normalized, parsed),
    shift: existing?.shift ?? (parsed.course === 2 || parsed.course === 3 ? 2 : 1),
  }
}

/** Додає в store усі групи з навплану (не лише КН з defaults). */
export function syncPlanningGroupsFromNavPlan(store: PlanningStore): PlanningStore {
  const map = new Map<string, GroupRow>()
  for (const g of store.groups) {
    map.set(normalizeGroupCode(g.code), g)
  }

  for (const row of store.navPlan) {
    if (!row.groupCode) continue
    const code = normalizeGroupCode(row.groupCode)
    if (map.has(code)) continue
    map.set(code, createGroupRowFromCode(code))
  }

  const groups = [...map.values()].sort((a, b) => a.code.localeCompare(b.code, 'uk'))
  return { ...store, groups }
}

export function buildGroupsMapFromStore(store: PlanningStore): Map<string, GroupRow> {
  const synced = syncPlanningGroupsFromNavPlan(store)
  const map = new Map<string, GroupRow>()
  for (const g of synced.groups) {
    map.set(normalizeGroupCode(g.code), g)
  }
  return map
}

export function ensureGroupRow(code: string, groupsMap: Map<string, GroupRow>): GroupRow {
  const normalized = normalizeGroupCode(code)
  const existing = groupsMap.get(normalized)
  if (existing) return existing
  const row = createGroupRowFromCode(normalized)
  groupsMap.set(normalized, row)
  return row
}
