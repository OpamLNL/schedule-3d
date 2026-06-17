import { useMemo, useRef } from 'react'
import { Text } from '@react-three/drei'
import type { ThreeEvent } from '@react-three/fiber'
import type { Mesh } from 'three'
import type { ConflictKind, EnrichedEntry, Group, ScheduleMeta } from '../types/schedule'
import { conflictColor } from '../utils/conflicts'
import {
  clusterEntries,
  shortDisplayText,
  type ScheduleEntryCluster,
} from '../utils/scheduleClusters'
import { slotAngle, slotToDayPeriod } from '../utils/slots'
import {
  CELL_DEPTH,
  CELL_WIDTH,
  CYLINDER_RADIUS,
  LAYER_GAP,
  LAYER_HEIGHT,
  computeCylinderLayout,
} from '../utils/scheduleCylinderLayout'
import { TimeSlotRing } from './TimeSlotRing'
import { CylinderSurfaceGrid } from './CylinderSurfaceGrid'

type ScheduleCylinderProps = {
  groups: Group[]
  entries: EnrichedEntry[]
  meta: ScheduleMeta
  selectedEntryId: string | null
  hoveredEntryId: string | null
  onSelect: (entryId: string) => void
  onHover: (entryId: string | null) => void
  teacherProjection?: {
    teacher: string
    entries: EnrichedEntry[]
    groups: Group[]
  } | null
}

function worstConflict(entries: EnrichedEntry[]): ConflictKind {
  if (entries.some((entry) => entry.conflict === 'teacher')) return 'teacher'
  if (entries.some((entry) => entry.conflict === 'room')) return 'room'
  return 'none'
}

function clusterIsActive(cluster: ScheduleEntryCluster, entryId: string | null): boolean {
  if (!entryId) return false
  return cluster.entries.some((entry) => entry.id === entryId)
}

export function ScheduleCylinder({
  groups,
  entries,
  meta,
  selectedEntryId,
  hoveredEntryId,
  onSelect,
  onHover,
  teacherProjection,
}: ScheduleCylinderProps) {
  const clustersByGroup = useMemo(() => {
    const map = new Map<string, ScheduleEntryCluster[]>()
    for (const group of groups) map.set(group.id, [])
    for (const group of groups) {
      const groupEntries = entries.filter((entry) => entry.groupId === group.id)
      map.set(group.id, clusterEntries(groupEntries))
    }
    return map
  }, [groups, entries])

  const layout = useMemo(() => computeCylinderLayout(groups.length), [groups.length])
  const { baseY, totalHeight, orbitPivotY } = layout

  return (
    <group position={[0, -orbitPivotY, 0]}>
      <CylinderSurfaceGrid
        meta={meta}
        groupCount={groups.length}
        baseY={baseY}
        totalHeight={totalHeight}
        radius={CYLINDER_RADIUS}
      />

      {groups.map((group, groupIndex) => {
        const y = baseY + groupIndex * (LAYER_HEIGHT + LAYER_GAP) + LAYER_HEIGHT / 2
        const clusters = clustersByGroup.get(group.id) ?? []

        return (
          <group key={group.id} position={[0, y, 0]}>
            <Text
              position={[CYLINDER_RADIUS + 0.9, 0, 0]}
              fontSize={0.22}
              color="#d7e3ff"
              anchorX="left"
              anchorY="middle"
            >
              {group.code}
            </Text>

            {clusters.map((cluster) => {
              const angle = slotAngle(cluster.primary.slotId, meta.totalSlots)
              const ringRadius = CYLINDER_RADIUS + CELL_DEPTH / 2
              const x = Math.cos(angle) * ringRadius
              const z = Math.sin(angle) * ringRadius
              const selected = clusterIsActive(cluster, selectedEntryId)
              const hovered = clusterIsActive(cluster, hoveredEntryId)
              const color = conflictColor(worstConflict(cluster.entries), selected, hovered)
              const { day, period } = slotToDayPeriod(cluster.primary.slotId, meta)
              const slotLabel = cluster.parallel ? `${day}${period} · поділ` : `${day}${period}`

              return (
                <ScheduleCell
                  key={cluster.key}
                  cluster={cluster}
                  position={[x, 0, z]}
                  rotation={[0, -angle + Math.PI / 2, 0]}
                  color={color}
                  slotLabel={slotLabel}
                  selected={selected}
                  onSelect={() => onSelect(cluster.primary.id)}
                  onHover={(value) => onHover(value ? cluster.primary.id : null)}
                />
              )
            })}
          </group>
        )
      })}

      <TimeSlotRing
        meta={meta}
        baseY={baseY}
        cylinderRadius={CYLINDER_RADIUS}
        entries={entries}
        selectedEntryId={selectedEntryId}
        hoveredEntryId={hoveredEntryId}
        teacherProjection={teacherProjection}
      />
    </group>
  )
}

type ScheduleCellProps = {
  cluster: ScheduleEntryCluster
  position: [number, number, number]
  rotation: [number, number, number]
  color: string
  slotLabel: string
  selected: boolean
  onSelect: () => void
  onHover: (active: boolean) => void
}

function ScheduleCell({
  cluster,
  position,
  rotation,
  color,
  slotLabel,
  selected,
  onSelect,
  onHover,
}: ScheduleCellProps) {
  const meshRef = useRef<Mesh>(null)
  const subjectLine = shortDisplayText(cluster.subject, cluster.parallel ? 18 : 24)
  const detailLine = cluster.parallel
    ? shortDisplayText(cluster.teachers.join(' · '), 28)
    : shortDisplayText(cluster.primary.teacher, 18)
  const widthScale = cluster.parallel ? 1.25 : 1
  const boxHeight = LAYER_HEIGHT * 0.72
  const faceZ = CELL_DEPTH / 2 + 0.02

  const handlePointerDown = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    onSelect()
  }

  return (
    <group position={position} rotation={rotation}>
      <mesh
        ref={meshRef}
        onPointerDown={handlePointerDown}
        onPointerOver={(event) => {
          event.stopPropagation()
          onHover(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          onHover(false)
          document.body.style.cursor = 'default'
        }}
        scale={selected ? [widthScale * 1.12, 1.12, 1.12] : [widthScale, 1, 1]}
      >
        <boxGeometry args={[CELL_WIDTH, LAYER_HEIGHT * 0.72, CELL_DEPTH]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={selected ? 0.35 : 0.12} />
      </mesh>
      <Text
        position={[0, boxHeight / 2 - 0.02, faceZ]}
        fontSize={0.095}
        color="#f8fbff"
        anchorX="center"
        anchorY="bottom"
        renderOrder={12}
        outlineWidth={0.008}
        outlineColor="#0b1220"
        material-depthTest={false}
      >
        {slotLabel}
      </Text>
      <Text
        position={[0, 0.02, faceZ]}
        fontSize={0.062}
        maxWidth={0.62}
        textAlign="center"
        color="#eef4ff"
        anchorX="center"
        anchorY="middle"
        renderOrder={11}
        material-depthTest={false}
      >
        {subjectLine}
      </Text>
      <Text
        position={[0, -0.12, faceZ]}
        fontSize={0.052}
        maxWidth={0.62}
        textAlign="center"
        color="#dbeafe"
        anchorX="center"
        anchorY="middle"
        renderOrder={11}
        material-depthTest={false}
      >
        {detailLine}
      </Text>
    </group>
  )
}
