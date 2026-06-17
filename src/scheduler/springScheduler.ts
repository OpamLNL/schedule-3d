import type {
  GroupRow,
  NavPlanRow,
  PlanningStore,
  RoomRuleRow,
  SubjectPrefRow,
  TeacherPrefRow,
} from '../types/planning'
import type { Group, Room, ScheduleData, ScheduleEntry, Teacher } from '../types/schedule'
import { effectiveShift, isRemoteGroup, parseGroupCode } from '../utils/groupCode'
import { buildGroupsMapFromStore, ensureGroupRow, placeholderRoom } from '../utils/groupDefaults'
import { newId, normalizeGroupCode, normalizeSubjectKey, normalizeTeacherField } from '../utils/normalize'
import {
  allowedSlotIds,
  isPhysicalEducation,
  pairsPerWeek,
  pePeriodScore,
  slotContext,
  springContactHours,
  subjectAllowsDay,
  subjectDayLimit,
  teacherAllowsSlot,
  scoreTeacherDailyLoad,
} from '../utils/scheduleConstraints'
import { assignParallelBundles, buildScheduleUnits } from '../utils/parallelSubgroups'

const META = {
  days: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт'],
  periodsPerDay: 8,
  totalSlots: 40,
}

export type LessonDemand = {
  key: string
  navRowId: string
  groupCode: string
  groupId: string
  subject: string
  teacher: string
  pairsPerWeek: number
  shift: 1 | 2
  remote: boolean
  room: string
  isPE: boolean
  teacherPref?: string
  subjectPref?: string
  /** Паралельні підгрупи — один слот для всіх у bundle */
  parallelBundleId?: string
  /** Ключ для ліміту пар на день (спільний для підгруп) */
  subjectDayKey?: string
}

export type SpringScheduleResult = {
  schedule: ScheduleData
  placed: number
  requested: number
  unplaced: LessonDemand[]
  warnings: string[]
}

export type ScheduleBuildProgress = {
  stage: string
  percent: number
  detail?: string
}

const yieldUi = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

type Occupancy = {
  teacher: Map<string, Set<number>>
  room: Map<string, Set<number>>
  group: Map<string, Set<number>>
  subjectDay: Map<string, Map<number, number>>
  subjectDays: Map<string, Set<number>>
}

function findTeacherPref(prefs: TeacherPrefRow[], teacher: string): string | undefined {
  return prefs.find((p) => p.teacher === teacher)?.rule
}

function findSubjectPref(
  prefs: SubjectPrefRow[],
  groupCode: string,
  subject: string,
): string | undefined {
  const code = normalizeGroupCode(groupCode)
  const subjKey = normalizeSubjectKey(subject)
  return prefs.find(
    (p) =>
      normalizeGroupCode(p.groupCode) === code &&
      normalizeSubjectKey(p.subject) === subjKey,
  )?.rule
}

function resolveRoom(
  row: NavPlanRow,
  groupRow: GroupRow,
  remote: boolean,
  roomRules: RoomRuleRow[],
): string {
  if (remote) return 'Дист'
  const subjKey = normalizeSubjectKey(row.subject)
  const rule = roomRules.find((r) => {
    const subjMatch =
      normalizeSubjectKey(r.subject) === subjKey ||
      row.subject.toLowerCase().includes(r.subject.toLowerCase())
    if (!subjMatch) return false
    if (!r.teacher) return true
    return row.teacher === r.teacher
  })
  if (rule) {
    if (rule.room === 'своя') return groupRow.room.startsWith('~') ? placeholderRoom(groupRow.code) : groupRow.room
    return rule.room
  }
  return groupRow.room
}

function buildDemands(store: PlanningStore, groupsMap: Map<string, GroupRow>): {
  demands: LessonDemand[]
  duplicateKeys: string[]
} {
  const buckets = new Map<
    string,
    { row: NavPlanRow; contact: number; groupRow: GroupRow; duplicate: boolean; teacher: string }
  >()

  for (const row of store.navPlan) {
    if (!row.groupCode || !row.subject) continue
    if (row.planKind !== 'schedule') continue
    const groupRow = ensureGroupRow(row.groupCode, groupsMap)
    const contact = springContactHours(row)
    if (contact <= 0) continue
    if (!row.teacher) continue

    const teacher = normalizeTeacherField(row.teacher)
    if (!teacher) continue

    const key = `${normalizeGroupCode(row.groupCode)}|${row.subject}|${teacher}`
    const existing = buckets.get(key)
    if (existing) {
      existing.duplicate = true
      existing.contact = Math.max(existing.contact, contact)
    } else {
      buckets.set(key, { row, contact, groupRow, duplicate: false, teacher })
    }
  }

  const demands: LessonDemand[] = []
  const duplicateKeys: string[] = []

  for (const [key, bucket] of buckets) {
    if (bucket.duplicate) duplicateKeys.push(key)
    const { row, contact, groupRow, teacher } = bucket
    const parsed = parseGroupCode(row.groupCode)
    const shift = effectiveShift(parsed.course, groupRow.shift)
    const remote = isRemoteGroup(row.groupCode, parsed.course)
    const weekly = pairsPerWeek(contact, groupRow.weeksSpring)
    if (weekly <= 0) continue

    demands.push({
      key,
      navRowId: row.id,
      groupCode: normalizeGroupCode(row.groupCode),
      groupId: groupRow.id,
      subject: row.subject,
      teacher,
      pairsPerWeek: weekly,
      shift,
      remote,
      room: resolveRoom(row, groupRow, remote, store.roomRules),
      isPE: isPhysicalEducation(row.subject),
      teacherPref: findTeacherPref(store.teacherPrefs, teacher),
      subjectPref: findSubjectPref(store.subjectPrefs, row.groupCode, row.subject),
    })
  }

  return {
    demands: demands.sort((a, b) => {
      if (a.isPE !== b.isPE) return a.isPE ? 1 : -1
      return b.pairsPerWeek - a.pairsPerWeek
    }),
    duplicateKeys,
  }
}

function createOccupancy(): Occupancy {
  return {
    teacher: new Map(),
    room: new Map(),
    group: new Map(),
    subjectDay: new Map(),
    subjectDays: new Map(),
  }
}

function occupy(setMap: Map<string, Set<number>>, key: string, slotId: number) {
  if (!setMap.has(key)) setMap.set(key, new Set())
  setMap.get(key)!.add(slotId)
}

function isOccupied(setMap: Map<string, Set<number>>, key: string, slotId: number): boolean {
  return setMap.get(key)?.has(slotId) ?? false
}

function teacherSlotsOnDay(
  occ: Occupancy,
  teacher: string,
  dayIndex: number,
  meta: { days: string[]; periodsPerDay: number; totalSlots: number; sourceFile: string; generatedAt: string; note: string },
): number {
  const slots = occ.teacher.get(teacher)
  if (!slots) return 0
  let count = 0
  for (const slotId of slots) {
    if (slotContext(slotId, meta).dayIndex === dayIndex) count += 1
  }
  return count
}

function teacherActiveDayCount(
  occ: Occupancy,
  teacher: string,
  meta: { days: string[]; periodsPerDay: number; totalSlots: number; sourceFile: string; generatedAt: string; note: string },
): number {
  const slots = occ.teacher.get(teacher)
  if (!slots) return 0
  const days = new Set<number>()
  for (const slotId of slots) {
    days.add(slotContext(slotId, meta).dayIndex)
  }
  return days.size
}

function teacherMaxDailyLoad(
  occ: Occupancy,
  teacher: string,
  meta: { days: string[]; periodsPerDay: number; totalSlots: number; sourceFile: string; generatedAt: string; note: string },
): number {
  let max = 0
  for (let dayIndex = 0; dayIndex < meta.days.length; dayIndex += 1) {
    max = Math.max(max, teacherSlotsOnDay(occ, teacher, dayIndex, meta))
  }
  return max
}

function scoreSlot(
  demand: LessonDemand,
  ctx: ReturnType<typeof slotContext>,
  occ: Occupancy,
  options?: { skipGroupCheck?: boolean; relaxSpacing?: boolean; ignoreRoom?: boolean },
): number | null {
  if (!teacherAllowsSlot(demand.teacherPref, ctx)) return null
  if (!subjectAllowsDay(demand.subjectPref, ctx.dayIndex)) return null

  const dayKey = demand.subjectDayKey ?? demand.key
  const dayCount = occ.subjectDay.get(dayKey)?.get(ctx.dayIndex) ?? 0
  const dayLimit = subjectDayLimit(demand.subjectPref)
  if (dayCount >= dayLimit) return null

  if (!options?.relaxSpacing && demand.subjectPref?.includes('min_1_день_між')) {
    const usedDays = occ.subjectDays.get(dayKey) ?? new Set()
    for (const d of usedDays) {
      if (Math.abs(d - ctx.dayIndex) <= 1) return null
    }
  }

  if (isOccupied(occ.teacher, demand.teacher, ctx.slotId)) return null
  if (!options?.skipGroupCheck && isOccupied(occ.group, demand.groupId, ctx.slotId)) return null
  if (!options?.ignoreRoom && !demand.remote && isOccupied(occ.room, demand.room, ctx.slotId)) return null

  const meta = { ...META, sourceFile: '', generatedAt: '', note: '' }
  const teacherDayLoad = teacherSlotsOnDay(occ, demand.teacher, ctx.dayIndex, meta)
  const teacherLoadScore = scoreTeacherDailyLoad(teacherDayLoad, demand.teacherPref)
  if (teacherLoadScore === null) return null

  let score = dayCount * 100
  score += ctx.period
  score += teacherLoadScore

  const teacherActiveDays = teacherActiveDayCount(occ, demand.teacher, meta)
  if (teacherDayLoad === 0 && teacherActiveDays > 0) {
    score += 90 + teacherActiveDays * 20
  }

  const busiestDayLoad = teacherMaxDailyLoad(occ, demand.teacher, meta)
  if (teacherDayLoad > 0 && teacherDayLoad === busiestDayLoad && busiestDayLoad >= 2) {
    score -= 40
  }

  if (demand.isPE) {
    score += pePeriodScore(ctx, demand.shift) * 40
  } else {
    score += dayCount * 50
  }

  const usedDays = occ.subjectDays.get(dayKey)?.size ?? 0
  if (usedDays > 0 && !occ.subjectDays.get(dayKey)?.has(ctx.dayIndex)) {
    if (teacherDayLoad === 0) score -= 10
    else score += 25
  }

  return score
}

function scoreParallelSlot(demands: LessonDemand[], ctx: ReturnType<typeof slotContext>, occ: Occupancy): number | null {
  if (demands.length === 0) return null
  if (isOccupied(occ.group, demands[0].groupId, ctx.slotId)) return null

  let totalScore = 0
  for (const demand of demands) {
    const score = scoreSlot(demand, ctx, occ, { skipGroupCheck: true })
    if (score === null) return null
    totalScore += score
  }

  return totalScore / demands.length
}

function pickSlot(
  demand: LessonDemand,
  occ: Occupancy,
  options?: { relaxSpacing?: boolean; ignoreRoom?: boolean },
): number | null {
  const meta = { ...META, sourceFile: '', generatedAt: '', note: '' }
  const candidates = allowedSlotIds(meta, demand.shift)
  let best: { slotId: number; score: number } | null = null

  for (const slotId of candidates) {
    const ctx = slotContext(slotId, meta)
    const score = scoreSlot(demand, ctx, occ, options)
    if (score === null) continue
    if (!best || score < best.score) best = { slotId, score }
  }

  return best?.slotId ?? null
}

function pickParallelSlot(demands: LessonDemand[], occ: Occupancy): number | null {
  const meta = { ...META, sourceFile: '', generatedAt: '', note: '' }
  const candidates = allowedSlotIds(meta, demands[0].shift)
  let best: { slotId: number; score: number } | null = null

  for (const slotId of candidates) {
    const ctx = slotContext(slotId, meta)
    const score = scoreParallelSlot(demands, ctx, occ)
    if (score === null) continue
    if (!best || score < best.score) best = { slotId, score }
  }

  return best?.slotId ?? null
}

function placeEntry(
  demand: LessonDemand,
  slotId: number,
  occ: Occupancy,
  entries: ScheduleEntry[],
  options?: { skipGroupOccupy?: boolean; skipRoomOccupy?: boolean },
) {
  const entry: ScheduleEntry = {
    id: newId('e'),
    groupId: demand.groupId,
    slotId,
    subject: demand.subject,
    teacher: demand.teacher,
    room: demand.room,
    parallelBundleId: demand.parallelBundleId,
  }
  entries.push(entry)
  occupy(occ.teacher, demand.teacher, slotId)
  if (!options?.skipGroupOccupy) occupy(occ.group, demand.groupId, slotId)
  if (!demand.remote && !options?.skipRoomOccupy) occupy(occ.room, demand.room, slotId)

  const dayKey = demand.subjectDayKey ?? demand.key
  if (!occ.subjectDay.has(dayKey)) occ.subjectDay.set(dayKey, new Map())
  const dayMap = occ.subjectDay.get(dayKey)!
  const { dayIndex } = slotContext(slotId, { ...META, sourceFile: '', generatedAt: '', note: '' })
  dayMap.set(dayIndex, (dayMap.get(dayIndex) ?? 0) + 1)

  if (!occ.subjectDays.has(dayKey)) occ.subjectDays.set(dayKey, new Set())
  occ.subjectDays.get(dayKey)!.add(dayIndex)
}

function placeParallelBundle(
  demands: LessonDemand[],
  slotId: number,
  occ: Occupancy,
  entries: ScheduleEntry[],
) {
  demands.forEach((demand, index) => {
    placeEntry(demand, slotId, occ, entries, { skipGroupOccupy: index > 0 })
  })
}

function unitPairsPerWeek(unit: ReturnType<typeof buildScheduleUnits<LessonDemand>>[number]): number {
  return unit.type === 'single' ? unit.demand.pairsPerWeek : unit.demands[0]?.pairsPerWeek ?? 0
}

type ScheduleUnit = ReturnType<typeof buildScheduleUnits<LessonDemand>>[number]

function unitGroupCode(unit: ScheduleUnit): string {
  return unit.type === 'single' ? unit.demand.groupCode : unit.demands[0]?.groupCode ?? ''
}

function unitTeacherKey(unit: ScheduleUnit): string {
  return unit.type === 'single'
    ? unit.demand.teacher
    : unit.demands.map((d) => d.teacher).sort().join('|')
}

/** Чергує предмети в межах групи (алгоритми ↔ технології), а не всі пари одного предмета підряд. */
function interleaveUnitsByGroup(units: ScheduleUnit[]): ScheduleUnit[] {
  const byGroup = new Map<string, ScheduleUnit[]>()
  for (const unit of units) {
    const group = unitGroupCode(unit)
    const list = byGroup.get(group) ?? []
    list.push(unit)
    byGroup.set(group, list)
  }

  for (const list of byGroup.values()) {
    list.sort((a, b) => {
      const subjA =
        a.type === 'single' ? a.demand.subject : a.demands.map((d) => d.subject).join('|')
      const subjB =
        b.type === 'single' ? b.demand.subject : b.demands.map((d) => d.subject).join('|')
      return subjA.localeCompare(subjB, 'uk') || unitSortWeight(b) - unitSortWeight(a)
    })
  }

  const groups = [...byGroup.keys()].sort((a, b) => a.localeCompare(b, 'uk'))
  const maxDepth = Math.max(...[...byGroup.values()].map((list) => list.length), 0)
  const result: ScheduleUnit[] = []
  for (let depth = 0; depth < maxDepth; depth += 1) {
    for (const group of groups) {
      const unit = byGroup.get(group)?.[depth]
      if (unit) result.push(unit)
    }
  }
  return result
}

/** Черга розміщення: по одній парі, чергуючи викладачів, групи та предмети. */
function buildFairPairQueue(units: ScheduleUnit[]): ScheduleUnit[] {
  const byTeacher = new Map<string, ScheduleUnit[]>()
  for (const unit of units) {
    const key = unitTeacherKey(unit)
    const list = byTeacher.get(key) ?? []
    list.push(unit)
    byTeacher.set(key, list)
  }

  const maxPairs = Math.max(...units.map((u) => unitPairsPerWeek(u)), 0)
  const queue: ScheduleUnit[] = []

  for (let pairIdx = 0; pairIdx < maxPairs; pairIdx += 1) {
    for (const teacherUnits of byTeacher.values()) {
      for (const unit of interleaveUnitsByGroup(teacherUnits)) {
        if (pairIdx < unitPairsPerWeek(unit)) queue.push(unit)
      }
    }
  }

  return queue
}

function unitSortWeight(unit: ReturnType<typeof buildScheduleUnits<LessonDemand>>[number]): number {
  if (unit.type === 'single') {
    return unit.demand.isPE ? -1 : unit.demand.pairsPerWeek
  }
  const isPE = unit.demands.some((d) => d.isPE)
  return isPE ? -1 : unitPairsPerWeek(unit)
}

function buildScheduleGroups(
  demands: LessonDemand[],
  groupsMap: Map<string, GroupRow>,
): Group[] {
  const ids = new Set(demands.map((d) => d.groupId))
  const groups: Group[] = []
  for (const row of groupsMap.values()) {
    if (!ids.has(row.id)) continue
    const parsed = parseGroupCode(row.code)
    groups.push({
      id: row.id,
      code: row.code,
      name: `Група ${row.code}`,
      specialty: parsed.specialty,
      course: parsed.course,
      room: row.room,
    })
  }
  return groups.sort((a, b) => a.code.localeCompare(b.code, 'uk'))
}

function buildLookups(entries: ScheduleEntry[]): { teachers: Teacher[]; rooms: Room[] } {
  const teacherNames = [...new Set(entries.map((e) => e.teacher).filter(Boolean))]
  const roomCodes = [...new Set(entries.map((e) => e.room).filter(Boolean))]
  return {
    teachers: teacherNames.map((name, i) => ({ id: `t${i + 1}`, name })),
    rooms: roomCodes.map((code, i) => ({ id: `r${i + 1}`, code })),
  }
}

async function reportProgress(
  onProgress: ((p: ScheduleBuildProgress) => void) | undefined,
  stage: string,
  percent: number,
  detail?: string,
) {
  onProgress?.({ stage, percent, detail })
  await yieldUi()
}

function buildSpringScheduleResult(
  store: PlanningStore,
  groupsMap: Map<string, GroupRow>,
  demands: LessonDemand[],
  warnings: string[],
  entries: ScheduleEntry[],
  unplaced: LessonDemand[],
  placed: number,
  requested: number,
): SpringScheduleResult {
  const { teachers, rooms } = buildLookups(entries)
  const schedule: ScheduleData = {
    meta: {
      sourceFile: store.navPlanSource ?? 'навплан',
      generatedAt: new Date().toISOString(),
      note: 'Автозбірка весняного семестру',
      days: META.days,
      periodsPerDay: META.periodsPerDay,
      totalSlots: META.totalSlots,
    },
    groups: buildScheduleGroups(demands, groupsMap),
    teachers,
    rooms,
    entries,
  }
  return { schedule, placed, requested, unplaced, warnings }
}

export async function buildSpringScheduleAsync(
  store: PlanningStore,
  onProgress?: (progress: ScheduleBuildProgress) => void,
): Promise<SpringScheduleResult> {
  const warnings: string[] = []

  await reportProgress(
    onProgress,
    'Підготовка',
    5,
    `Навплан: ${store.navPlan.length} рядків`,
  )

  await reportProgress(onProgress, 'Синхронізація груп', 12)
  const groupsMap = buildGroupsMapFromStore(store)
  const totalGroups = groupsMap.size

  await reportProgress(onProgress, 'Відбір предметів', 20)
  const { demands: rawDemands, duplicateKeys } = buildDemands(store, groupsMap)
  const { demands, warnings: parallelWarnings, bundleCount } = assignParallelBundles(rawDemands)
  warnings.push(...parallelWarnings)

  if (duplicateKeys.length > 0) {
    warnings.push(
      `Дублікати в навплані (група+предмет+викладач): ${duplicateKeys.length} — перевірте Excel.`,
    )
  }

  if (bundleCount > 0) {
    warnings.push(
      `Паралельні підгрупи: ${bundleCount} наборів (різні викладачі, один слот — напр. іноземна 13/9 студ.).`,
    )
  }

  const scheduleUnits = buildScheduleUnits(demands)
  const pairQueue = buildFairPairQueue(scheduleUnits)

  const totalPairs = pairQueue.length

  if (demands.length === 0) {
    warnings.push('Немає рядків навплану з годинами весняного семестру.')
  }

  warnings.push(`Груп у навплані: ${totalGroups} (усі спеціальності, не лише КН).`)
  warnings.push('Без розкладу: практики, курсові, керівництво, КП/КР/ДП, ДПА/ДКК.')
  warnings.push('Викладач: за замовчуванням 3–4 пари на день (max 4); преференції на вкладці «Правила».')

  const remoteGroups = demands.filter((d) => d.remote).length
  const shift2Groups = new Set(demands.filter((d) => d.shift === 2).map((d) => d.groupCode)).size
  if (remoteGroups > 0) {
    warnings.push(
      `Дистанційний режим (2–3 курс, непарна підгрупа): ${remoteGroups} предметів — аудиторія «Дист».`,
    )
  }
  warnings.push(`2–3 курс → зміна 2 (пари 5–8): ${shift2Groups} груп.`)

  await reportProgress(
    onProgress,
    'Відбір предметів',
    28,
    `${demands.length} рядків · ${scheduleUnits.length} блоків · ${totalPairs} пар на тиждень`,
  )

  const occ = createOccupancy()
  const entries: ScheduleEntry[] = []
  const unplaced: LessonDemand[] = []
  let requested = 0
  let placed = 0
  let donePairs = 0

  await reportProgress(onProgress, 'Розміщення пар', 30)

  for (const unit of pairQueue) {
    requested += unit.type === 'parallel' ? unit.demands.length : 1
    donePairs += 1

    if (unit.type === 'parallel') {
      const slotId = pickParallelSlot(unit.demands, occ)
      if (slotId === null) {
        for (const demand of unit.demands) unplaced.push({ ...demand, pairsPerWeek: 1 })
      } else {
        placeParallelBundle(unit.demands, slotId, occ, entries)
        placed += unit.demands.length
      }
    } else {
      const slotId = pickSlot(unit.demand, occ)
      if (slotId === null) {
        unplaced.push({ ...unit.demand, pairsPerWeek: 1 })
      } else {
        placeEntry(unit.demand, slotId, occ, entries)
        placed += 1
      }
    }

    if (
      totalPairs > 0 &&
      (donePairs === 1 || donePairs === totalPairs || donePairs % 20 === 0)
    ) {
      const percent = 30 + Math.round((donePairs / totalPairs) * 58)
      await reportProgress(
        onProgress,
        'Розміщення пар',
        percent,
        `${donePairs} / ${totalPairs} · розміщено ${placed}`,
      )
    }
  }

  if (unplaced.length > 0) {
    await reportProgress(onProgress, 'Дорозміщення', 88, `${unplaced.length} пар`)
    const retry = [...unplaced]
    unplaced.length = 0
    for (const demand of retry) {
      const strictSlot = pickSlot(demand, occ, { relaxSpacing: true })
      const slotId =
        strictSlot ?? pickSlot(demand, occ, { relaxSpacing: true, ignoreRoom: true })
      if (slotId === null) {
        unplaced.push(demand)
        continue
      }
      placeEntry(demand, slotId, occ, entries, {
        skipRoomOccupy: strictSlot === null,
      })
      placed += 1
    }
  }

  if (unplaced.length > 0) {
    warnings.push(`Не вдалось розмістити ${unplaced.length} пар — перевірте конфлікти.`)
    const sample = unplaced.slice(0, 8).map((d) => `${d.groupCode} · ${d.subject} · ${d.teacher}`)
    warnings.push(`Приклади: ${sample.join('; ')}${unplaced.length > 8 ? '…' : ''}`)
  }

  await reportProgress(onProgress, 'Збереження результату', 92)

  const result = buildSpringScheduleResult(
    store,
    groupsMap,
    demands,
    warnings,
    entries,
    unplaced,
    placed,
    requested,
  )

  await reportProgress(
    onProgress,
    'Готово',
    100,
    `${placed} з ${requested} пар · ${totalGroups} груп`,
  )

  return result
}
