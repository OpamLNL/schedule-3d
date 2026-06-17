import { normalizeGroupCode } from './normalize'

export type DemandLike = {
  key: string
  groupCode: string
  groupId: string
  subject: string
  teacher: string
  pairsPerWeek: number
  parallelBundleId?: string
  subjectDayKey?: string
}

/** Ключ предмета без «13 студ», «9 студентів» тощо — для паралельних підгруп. */
export function parallelSubjectKey(subject: string): string {
  let s = String(subject ?? '').toLowerCase().replace(/\*+/g, '')
  s = s.replace(/\d+\s*ст(?:уд(?:ент(?:ів|и|а)?)?)?\.?/gi, ' ')
  s = s.replace(/ст(?:уд(?:ент(?:ів|и|a)?)?)?\.?\s*\d+/gi, ' ')
  s = s.replace(/\(\s*\d+\s*ст[^)]*\)/gi, ' ')
  s = s.replace(/\([^)]*\)/g, ' ')
  return s.replace(/\s+/g, ' ').trim()
}

export function parallelBundleDayKey(groupCode: string, subject: string): string {
  return `${normalizeGroupCode(groupCode)}|${parallelSubjectKey(subject)}`
}

export function assignParallelBundles<T extends DemandLike>(demands: T[]): {
  demands: T[]
  warnings: string[]
  bundleCount: number
} {
  const warnings: string[] = []
  const clusters = new Map<string, T[]>()

  for (const demand of demands) {
    const clusterKey = `${demand.groupCode}|${parallelSubjectKey(demand.subject)}`
    const bucket = clusters.get(clusterKey) ?? []
    bucket.push(demand)
    clusters.set(clusterKey, bucket)
  }

  let bundleCount = 0

  for (const [clusterKey, cluster] of clusters) {
    if (cluster.length < 2) continue

    const teachers = new Set(cluster.map((d) => d.teacher))
    if (teachers.size < 2) continue

    bundleCount += 1
    const bundleId = `pb|${clusterKey}`
    const dayKey = parallelBundleDayKey(cluster[0].groupCode, cluster[0].subject)
    const pairCounts = cluster.map((d) => d.pairsPerWeek)
    const minPairs = Math.min(...pairCounts)
    const maxPairs = Math.max(...pairCounts)

    if (minPairs !== maxPairs) {
      warnings.push(
        `Підгрупи «${cluster[0].subject}» (${cluster[0].groupCode}): ${minPairs}–${maxPairs} пар/тиж — синхронізовано до ${minPairs}.`,
      )
    }

    for (const demand of cluster) {
      demand.parallelBundleId = bundleId
      demand.subjectDayKey = dayKey
      demand.pairsPerWeek = minPairs
    }
  }

  for (const demand of demands) {
    if (!demand.subjectDayKey) demand.subjectDayKey = demand.key
  }

  return { demands, warnings, bundleCount }
}

export function buildScheduleUnits<T extends DemandLike>(demands: T[]): Array<
  | { type: 'single'; demand: T }
  | { type: 'parallel'; bundleId: string; demands: T[] }
> {
  const usedKeys = new Set<string>()
  const units: Array<
    | { type: 'single'; demand: T }
    | { type: 'parallel'; bundleId: string; demands: T[] }
  > = []

  for (const demand of demands) {
    if (usedKeys.has(demand.key)) continue

    if (demand.parallelBundleId) {
      const peers = demands.filter((d) => d.parallelBundleId === demand.parallelBundleId)
      for (const peer of peers) usedKeys.add(peer.key)
      units.push({ type: 'parallel', bundleId: demand.parallelBundleId, demands: peers })
      continue
    }

    usedKeys.add(demand.key)
    units.push({ type: 'single', demand })
  }

  return units
}
