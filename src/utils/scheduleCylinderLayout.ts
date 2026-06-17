export const CYLINDER_RADIUS = 4.2
export const LAYER_HEIGHT = 0.72
export const LAYER_GAP = 0.12
export const CELL_DEPTH = 0.28
export const CELL_WIDTH = 0.34
export const TIME_RING_OFFSET = 0.82
export const TIME_RING_HEIGHT = 0.22

export function computeCylinderLayout(groupCount: number) {
  const totalHeight = groupCount * (LAYER_HEIGHT + LAYER_GAP)
  const baseY = -totalHeight / 2
  const yTop = baseY + totalHeight
  const ringY = baseY - TIME_RING_OFFSET
  const ringBottom = ringY - TIME_RING_HEIGHT
  const orbitPivotY = (yTop + ringBottom) / 2

  return {
    totalHeight,
    baseY,
    yTop,
    ringY,
    orbitPivotY,
  }
}
