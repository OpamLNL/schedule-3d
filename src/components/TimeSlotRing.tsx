import { useMemo } from 'react'
import { Text } from '@react-three/drei'
import type { ConflictKind, EnrichedEntry, Group, ScheduleMeta } from '../types/schedule'
import { clusterEntries, shortDisplayText } from '../utils/scheduleClusters'
import { slotAngle, slotToDayPeriod } from '../utils/slots'

const DAY_COLORS = ['#065f46', '#047857', '#059669', '#10b981', '#34d399']
const TEACHER_SLOT_COLOR = '#2563eb'
const TEACHER_SLOT_EMISSIVE = '#60a5fa'

type SlotStat = {
  slotId: number
  count: number
  worstConflict: ConflictKind
}

type TimeSlotRingProps = {
  meta: ScheduleMeta
  baseY: number
  cylinderRadius: number
  entries: EnrichedEntry[]
  selectedEntryId: string | null
  hoveredEntryId: string | null
  teacherProjection?: {
    teacher: string
    entries: EnrichedEntry[]
    groups: Group[]
  } | null
}

function buildSlotStats(entries: EnrichedEntry[], totalSlots: number): SlotStat[] {
  const stats: SlotStat[] = Array.from({ length: totalSlots }, (_, index) => ({
    slotId: index + 1,
    count: 0,
    worstConflict: 'none' as ConflictKind,
  }))

  for (const entry of entries) {
    const stat = stats[entry.slotId - 1]
    if (!stat) continue
    stat.count += 1
    if (entry.conflict === 'teacher') stat.worstConflict = 'teacher'
    else if (entry.conflict === 'room' && stat.worstConflict !== 'teacher') stat.worstConflict = 'room'
  }

  return stats
}

function innerSegmentStyle(stat: SlotStat, maxCount: number, active: boolean, teacherSlot: boolean) {
  if (teacherSlot) {
    return {
      color: TEACHER_SLOT_COLOR,
      emissive: TEACHER_SLOT_EMISSIVE,
      emissiveIntensity: active ? 0.85 : 0.55,
      opacity: 0.95,
    }
  }
  if (stat.worstConflict === 'teacher') {
    return { color: '#d64545', emissive: '#ff5a5f', emissiveIntensity: active ? 0.75 : 0.45, opacity: 0.95 }
  }
  if (stat.worstConflict === 'room') {
    return { color: '#d8891d', emissive: '#ffb020', emissiveIntensity: active ? 0.65 : 0.38, opacity: 0.92 }
  }
  if (stat.count > 0) {
    const load = 0.25 + (stat.count / Math.max(maxCount, 1)) * 0.55
    return { color: '#2f5f93', emissive: '#4da3ff', emissiveIntensity: active ? load + 0.2 : load, opacity: 0.85 }
  }
  return { color: '#141c29', emissive: '#1f2937', emissiveIntensity: 0.05, opacity: 0.55 }
}

function shortText(value: string, max = 14): string {
  return shortDisplayText(value, max)
}

function buildTeacherSlotClusters(
  entries: EnrichedEntry[],
  groupById: Map<string, Group>,
): Array<{ key: string; label: string }> {
  return clusterEntries(entries).map((cluster) => {
    const groupCode = groupById.get(cluster.primary.groupId)?.code ?? '?'
    const label = cluster.parallel
      ? `${groupCode} · поділ · ${shortText(cluster.subject, 16)} · ${shortText(cluster.teachers.join(' · '), 20)}`
      : `${groupCode} · ${shortText(cluster.subject)} · ${cluster.primary.room}`
    return { key: cluster.key, label }
  })
}

export function TimeSlotRing({
  meta,
  baseY,
  cylinderRadius,
  entries,
  selectedEntryId,
  hoveredEntryId,
  teacherProjection,
}: TimeSlotRingProps) {
  const ringY = baseY - 0.82
  const ringInner = cylinderRadius + 0.55
  const ringOuter = cylinderRadius + 1.85
  const pulseInner = cylinderRadius + 0.12
  const pulseOuter = ringInner - 0.08
  const pulseMid = (pulseInner + pulseOuter) / 2
  const ringThickness = ringOuter - ringInner
  const ringMid = (ringInner + ringOuter) / 2
  const slotAngleStep = (Math.PI * 2) / meta.totalSlots
  const segmentArc = ringMid * slotAngleStep * 0.9
  const pulseArc = pulseMid * slotAngleStep * 0.88

  const slotStats = useMemo(() => buildSlotStats(entries, meta.totalSlots), [entries, meta.totalSlots])
  const maxCount = useMemo(() => Math.max(1, ...slotStats.map((stat) => stat.count)), [slotStats])

  const groupById = useMemo(() => {
    const map = new Map<string, Group>()
    for (const group of teacherProjection?.groups ?? []) map.set(group.id, group)
    return map
  }, [teacherProjection?.groups])

  const teacherEntriesBySlot = useMemo(() => {
    const map = new Map<number, EnrichedEntry[]>()
    if (!teacherProjection) return map
    for (const entry of teacherProjection.entries) {
      const bucket = map.get(entry.slotId) ?? []
      bucket.push(entry)
      map.set(entry.slotId, bucket)
    }
    return map
  }, [teacherProjection])

  const activeSlotId = useMemo(() => {
    if (hoveredEntryId) {
      return entries.find((entry) => entry.id === hoveredEntryId)?.slotId ?? null
    }
    if (selectedEntryId) {
      return entries.find((entry) => entry.id === selectedEntryId)?.slotId ?? null
    }
    return null
  }, [entries, hoveredEntryId, selectedEntryId])

  return (
    <group position={[0, ringY, 0]}>
      {Array.from({ length: meta.totalSlots }).map((_, slotIndex) => {
        const slotId = slotIndex + 1
        const midAngle = slotAngle(slotId, meta.totalSlots)
        const stat = slotStats[slotIndex]
        const teacherSlot = teacherEntriesBySlot.has(slotId)
        const active = activeSlotId === slotId
        const pulseStyle = innerSegmentStyle(stat, maxCount, active, teacherSlot)
        const px = Math.cos(midAngle) * pulseMid
        const pz = Math.sin(midAngle) * pulseMid

        return (
          <group key={`pulse-${slotId}`}>
            <mesh position={[px, 0.03, pz]} rotation={[0, -midAngle + Math.PI / 2, 0]}>
              <boxGeometry args={[pulseArc, 0.08, pulseOuter - pulseInner]} />
              <meshStandardMaterial
                color={pulseStyle.color}
                emissive={pulseStyle.emissive}
                emissiveIntensity={pulseStyle.emissiveIntensity}
                transparent
                opacity={pulseStyle.opacity}
              />
            </mesh>

            {(stat.worstConflict !== 'none' || active || teacherSlot) && (
              <mesh
                position={[
                  Math.cos(midAngle) * ((pulseOuter + ringInner) / 2),
                  0.05 + (active ? 0.04 : 0),
                  Math.sin(midAngle) * ((pulseOuter + ringInner) / 2),
                ]}
                rotation={[0, -midAngle + Math.PI / 2, 0]}
              >
                <boxGeometry args={[0.04, 0.06 + (active ? 0.05 : 0), ringInner - pulseOuter + 0.12]} />
                <meshStandardMaterial
                  color={active ? '#eef4ff' : pulseStyle.emissive}
                  emissive={pulseStyle.emissive}
                  emissiveIntensity={active ? 0.8 : teacherSlot ? 0.55 : 0.35}
                  transparent
                  opacity={0.85}
                />
              </mesh>
            )}
          </group>
        )
      })}

      {meta.days.map((day, dayIndex) => {
        const firstSlot = dayIndex * meta.periodsPerDay + 1
        const lastSlot = firstSlot + meta.periodsPerDay - 1
        const dayMidAngle = (slotAngle(firstSlot, meta.totalSlots) + slotAngle(lastSlot, meta.totalSlots)) / 2
        const dayLabelRadius = ringOuter + 0.95

        return (
          <Text
            key={day}
            position={[
              Math.cos(dayMidAngle) * dayLabelRadius,
              0.18,
              Math.sin(dayMidAngle) * dayLabelRadius,
            ]}
            rotation={[0, -dayMidAngle + Math.PI / 2, 0]}
            fontSize={0.28}
            color="#f3f7ff"
            anchorX="center"
            anchorY="middle"
            outlineWidth={0.015}
            outlineColor="#0b1220"
          >
            {day}
          </Text>
        )
      })}

      {Array.from({ length: meta.totalSlots }).map((_, slotIndex) => {
        const slotId = slotIndex + 1
        const midAngle = slotAngle(slotId, meta.totalSlots)
        const { period, dayIndex } = slotToDayPeriod(slotId, meta)
        const x = Math.cos(midAngle) * ringMid
        const z = Math.sin(midAngle) * ringMid
        const active = activeSlotId === slotId
        const teacherEntries = teacherEntriesBySlot.get(slotId) ?? []
        const teacherSlot = teacherEntries.length > 0
        const blockHeight = active ? 0.14 : teacherSlot ? 0.12 : 0.1
        const blockY = 0.08
        const blockTop = blockY + blockHeight / 2
        const labelRadius = ringMid - 0.05
        const labelX = Math.cos(midAngle) * labelRadius
        const labelZ = Math.sin(midAngle) * labelRadius

        return (
          <group key={`ring-slot-${slotId}`}>
            <mesh position={[x, blockY, z]} rotation={[0, -midAngle + Math.PI / 2, 0]}>
              <boxGeometry args={[segmentArc, blockHeight, ringThickness * 0.88]} />
              <meshStandardMaterial
                color={teacherSlot ? TEACHER_SLOT_COLOR : DAY_COLORS[dayIndex] ?? '#334155'}
                emissive={teacherSlot ? TEACHER_SLOT_EMISSIVE : DAY_COLORS[dayIndex] ?? '#334155'}
                emissiveIntensity={teacherSlot ? (active ? 0.55 : 0.35) : active ? 0.35 : 0.18}
              />
            </mesh>

            <Text
              position={[labelX, blockTop + 0.04, labelZ]}
              rotation={[0, -midAngle + Math.PI / 2, 0]}
              fontSize={0.18}
              color="#ffffff"
              anchorX="center"
              anchorY="bottom"
              renderOrder={12}
              outlineWidth={0.014}
              outlineColor="#0b1220"
              material-depthTest={false}
            >
              {String(period)}
            </Text>

            {teacherSlot
              ? buildTeacherSlotClusters(teacherEntries, groupById).map(({ key, label }, entryIndex) => (
                  <Text
                    key={key}
                    position={[
                      Math.cos(midAngle) * (ringOuter + 0.42 + entryIndex * 0.06),
                      0.04,
                      Math.sin(midAngle) * (ringOuter + 0.42 + entryIndex * 0.06),
                    ]}
                    rotation={[0, -midAngle + Math.PI / 2, 0]}
                    fontSize={0.1}
                    color="#dbeafe"
                    anchorX="center"
                    anchorY="top"
                    maxWidth={0.85}
                    textAlign="center"
                    renderOrder={11}
                    outlineWidth={0.01}
                    outlineColor="#0b1220"
                    material-depthTest={false}
                  >
                    {label}
                  </Text>
                ))
              : null}
          </group>
        )
      })}
    </group>
  )
}
