import { useMemo } from 'react'
import { BufferGeometry, Float32BufferAttribute } from 'three'
import type { ScheduleMeta } from '../types/schedule'
import { LAYER_GAP, LAYER_HEIGHT } from '../utils/scheduleCylinderLayout'
import { slotAngle } from '../utils/slots'

type CylinderSurfaceGridProps = {
  meta: ScheduleMeta
  groupCount: number
  baseY: number
  totalHeight: number
  radius: number
}

function pushCircle(points: number[], y: number, radius: number, segments = 72) {
  for (let index = 0; index < segments; index += 1) {
    const angle0 = (index / segments) * Math.PI * 2 - Math.PI / 2
    const angle1 = ((index + 1) / segments) * Math.PI * 2 - Math.PI / 2
    points.push(
      Math.cos(angle0) * radius,
      y,
      Math.sin(angle0) * radius,
      Math.cos(angle1) * radius,
      y,
      Math.sin(angle1) * radius,
    )
  }
}

function pushMeridian(points: number[], angle: number, yBottom: number, yTop: number, radius: number) {
  points.push(
    Math.cos(angle) * radius,
    yBottom,
    Math.sin(angle) * radius,
    Math.cos(angle) * radius,
    yTop,
    Math.sin(angle) * radius,
  )
}

export function CylinderSurfaceGrid({
  meta,
  groupCount,
  baseY,
  totalHeight,
  radius,
}: CylinderSurfaceGridProps) {
  const { lineGeometry, dayLineGeometry } = useMemo(() => {
    const gridPoints: number[] = []
    const dayPoints: number[] = []
    const yTop = baseY + totalHeight
    const slotStep = (Math.PI * 2) / meta.totalSlots
    const gridRadius = radius - 0.03

    for (let layerIndex = 0; layerIndex < groupCount; layerIndex += 1) {
      const layerBottom = baseY + layerIndex * (LAYER_HEIGHT + LAYER_GAP)
      const layerTop = layerBottom + LAYER_HEIGHT
      pushCircle(gridPoints, layerBottom, gridRadius)
      pushCircle(gridPoints, layerTop, gridRadius)
    }

    for (let slotIndex = 0; slotIndex < meta.totalSlots; slotIndex += 1) {
      const boundaryAngle = slotAngle(slotIndex + 1, meta.totalSlots) - slotStep / 2
      pushMeridian(gridPoints, boundaryAngle, baseY, yTop, gridRadius)
    }

    for (let dayIndex = 1; dayIndex < meta.days.length; dayIndex += 1) {
      const dayBoundaryAngle =
        slotAngle(dayIndex * meta.periodsPerDay + 1, meta.totalSlots) - slotStep / 2
      pushMeridian(dayPoints, dayBoundaryAngle, baseY, yTop, gridRadius + 0.015)
    }

    const lineGeometry = new BufferGeometry()
    lineGeometry.setAttribute('position', new Float32BufferAttribute(gridPoints, 3))

    const dayLineGeometry = new BufferGeometry()
    dayLineGeometry.setAttribute('position', new Float32BufferAttribute(dayPoints, 3))

    return { lineGeometry, dayLineGeometry }
  }, [baseY, groupCount, meta.days.length, meta.periodsPerDay, meta.totalSlots, radius, totalHeight])

  return (
    <group>
      <lineSegments geometry={lineGeometry}>
        <lineBasicMaterial color="#5a718d" transparent opacity={0.42} />
      </lineSegments>
      <lineSegments geometry={dayLineGeometry}>
        <lineBasicMaterial color="#8ea8c4" transparent opacity={0.72} />
      </lineSegments>
    </group>
  )
}
