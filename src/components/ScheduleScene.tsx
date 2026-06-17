import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Vector3 } from 'three'
import { useTheme } from '../context/ThemeContext'
import type { EnrichedEntry, Group, ScheduleMeta } from '../types/schedule'
import { ScheduleCylinder } from './ScheduleCylinder'

type ScheduleSceneProps = {
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

const ORBIT_TARGET = new Vector3(0, 0, 0)
const DEFAULT_CAMERA = { position: [8, 6, 10] as const, fov: 50 }

function SceneControls({ groupCount }: { groupCount: number }) {
  const controlsRef = useRef<OrbitControlsImpl>(null)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls) return
    controls.target.copy(ORBIT_TARGET)
    controls.update()
  }, [groupCount])

  return (
    <OrbitControls
      ref={controlsRef}
      makeDefault
      enablePan
      enableZoom
      zoomSpeed={1.15}
      minDistance={3}
      maxDistance={72}
      maxPolarAngle={Math.PI / 1.7}
      screenSpacePanning={false}
      target={ORBIT_TARGET}
    />
  )
}

export function ScheduleScene(props: ScheduleSceneProps) {
  const { sceneBackground } = useTheme()
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const root = wrapRef.current
    if (!root) return
    const canvas = root.querySelector('canvas')
    if (!canvas) return

    const blockPageScroll = (event: WheelEvent) => {
      event.preventDefault()
    }

    canvas.addEventListener('wheel', blockPageScroll, { passive: false })
    return () => canvas.removeEventListener('wheel', blockPageScroll)
  }, [])

  return (
    <div ref={wrapRef} className="scene-canvas-wrap">
      <Canvas className="scene-canvas" dpr={[1, 2]} gl={{ antialias: true }}>
        <color attach="background" args={[sceneBackground]} />
        <PerspectiveCamera makeDefault position={DEFAULT_CAMERA.position} fov={DEFAULT_CAMERA.fov} />
        <ambientLight intensity={0.55} />
        <directionalLight position={[8, 12, 6]} intensity={1.1} />
        <directionalLight position={[-6, 4, -8]} intensity={0.35} />
        <ScheduleCylinder {...props} />
        <SceneControls groupCount={props.groups.length} />
      </Canvas>
    </div>
  )
}
