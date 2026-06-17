import { idbGetFile, idbSetFile } from './documentStorage'
import * as XLSX from 'xlsx'
import { parseNavPlanWorkbook } from '../utils/parseNavPlan'

const NAV_PLAN_KEY = 'navPlanSource'

type StoredNavPlanFile = {
  name: string
  buffer: ArrayBuffer
  savedAt: string
}

export async function saveNavPlanSourceFile(file: File): Promise<void> {
  const payload: StoredNavPlanFile = {
    name: file.name,
    buffer: await file.arrayBuffer(),
    savedAt: new Date().toISOString(),
  }
  await idbSetFile(NAV_PLAN_KEY, payload)
}

export async function loadNavPlanSourceFile(): Promise<StoredNavPlanFile | null> {
  try {
    return await idbGetFile<StoredNavPlanFile>(NAV_PLAN_KEY)
  } catch {
    return null
  }
}

export async function reparseNavPlanFromStoredFile() {
  const stored = await loadNavPlanSourceFile()
  if (!stored) return null
  const workbook = XLSX.read(stored.buffer, { type: 'array' })
  const rows = parseNavPlanWorkbook(workbook)
  return { rows, source: stored.name }
}
