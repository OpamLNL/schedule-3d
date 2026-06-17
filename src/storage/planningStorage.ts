import {
  DEFAULT_GROUPS,
  DEFAULT_ROOM_RULES,
  DEFAULT_SUBJECT_PREFS,
  DEFAULT_TEACHER_PREFS,
} from '../data/defaults'
import type { PlanningStore } from '../types/planning'
import { normalizeNavPlanRow } from '../utils/parseNavPlan'

const STORAGE_KEY = 'schedule3d-planning-v1'

export function loadPlanningStore(): PlanningStore {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultStore()
    const parsed = JSON.parse(raw) as PlanningStore
    return {
      ...createDefaultStore(),
      ...parsed,
      navPlan: (parsed.navPlan ?? []).map((row) => normalizeNavPlanRow(row)),
      groups: parsed.groups?.length ? parsed.groups : DEFAULT_GROUPS,
      roomRules: parsed.roomRules?.length ? parsed.roomRules : DEFAULT_ROOM_RULES,
      teacherPrefs: parsed.teacherPrefs ?? DEFAULT_TEACHER_PREFS,
      subjectPrefs: parsed.subjectPrefs ?? DEFAULT_SUBJECT_PREFS,
    }
  } catch {
    return createDefaultStore()
  }
}

export function savePlanningStore(store: PlanningStore): void {
  const payload: PlanningStore = {
    ...store,
    updatedAt: new Date().toISOString(),
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(payload))
}

export function createDefaultStore(): PlanningStore {
  return {
    navPlan: [],
    groups: structuredClone(DEFAULT_GROUPS),
    roomRules: structuredClone(DEFAULT_ROOM_RULES),
    teacherPrefs: structuredClone(DEFAULT_TEACHER_PREFS),
    subjectPrefs: structuredClone(DEFAULT_SUBJECT_PREFS),
  }
}

