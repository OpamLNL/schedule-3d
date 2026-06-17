import type { PrintScheduleDocument } from '../types/documents'
import type { Group, ScheduleData } from '../types/schedule'
import { ensureEditorName } from '../storage/editorIdentity'
import { loadExportLocationPrefs } from '../storage/exportLocationStorage'
import {
  createExportSessionDirectory,
  exportSessionFolderName,
  safeExportFileName,
  writeExportFile,
} from './fileExport'
import { buildPrintScheduleHtml, createPrintScheduleDocument } from './schedulePrintExport'

export type BatchExportScope = 'all' | 'selected'

export type BatchExportOptions = {
  scope: BatchExportScope
  groupCodes: string[]
  includeFullScheduleJson: boolean
  includeGroupHtml: boolean
  includeGroupJson: boolean
}

export type BatchExportProgress = {
  done: number
  total: number
  label: string
}

export type BatchExportResult = {
  groups: number
  files: number
  method: 'folder' | 'downloads'
  folderLabel?: string
  sessionFolder?: string
}

function resolveTargetGroups(schedule: ScheduleData, options: BatchExportOptions): Group[] {
  const sorted = [...schedule.groups].sort((a, b) => a.code.localeCompare(b.code, 'uk'))
  if (options.scope === 'all') return sorted
  const selected = new Set(options.groupCodes.map((code) => code.trim().toUpperCase()))
  return sorted.filter((group) => selected.has(group.code.toUpperCase()))
}

export function buildGroupPrintDocument(schedule: ScheduleData, group: Group): PrintScheduleDocument {
  const entries = schedule.entries.filter((entry) => entry.groupId === group.id)
  return createPrintScheduleDocument(
    schedule,
    'group',
    group.code,
    `Група ${group.code}`,
    entries,
    ensureEditorName(),
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms))
}

function countFiles(groups: Group[], options: BatchExportOptions): number {
  let total = 1
  if (options.includeFullScheduleJson) total += 1
  const perGroup = Number(options.includeGroupHtml) + Number(options.includeGroupJson)
  total += groups.length * perGroup
  return total
}

export async function exportScheduleBatch(
  schedule: ScheduleData,
  options: BatchExportOptions,
  onProgress?: (progress: BatchExportProgress) => void,
): Promise<BatchExportResult> {
  const groups = resolveTargetGroups(schedule, options)
  if (groups.length === 0) {
    throw new Error('Не обрано жодної групи для експорту')
  }

  const sessionName = exportSessionFolderName()
  const sessionDir = await createExportSessionDirectory()
  const sessionFolder = sessionDir ? sessionName : undefined
  let method: 'folder' | 'downloads' = sessionDir ? 'folder' : 'downloads'

  const total = countFiles(groups, options)
  let done = 0
  const report = (label: string) => {
    done += 1
    onProgress?.({ done, total, label })
  }

  const manifest = {
    exportedAt: new Date().toISOString(),
    exportedBy: ensureEditorName(),
    scope: options.scope,
    groups: groups.map((group) => group.code),
    source: schedule.meta.sourceFile,
    generatedAt: schedule.meta.generatedAt,
    sessionFolder,
  }

  const manifestResult = await writeExportFile(
    sessionDir ? 'manifest.json' : `${sessionName}_manifest.json`,
    JSON.stringify(manifest, null, 2),
    'application/json;charset=utf-8',
    sessionDir,
  )
  method = manifestResult.method
  report('manifest.json')
  if (!sessionDir) await sleep(180)

  if (options.includeFullScheduleJson) {
    const fullResult = await writeExportFile(
      sessionDir ? 'schedule-full.json' : `${sessionName}_schedule-full.json`,
      JSON.stringify(schedule, null, 2),
      'application/json;charset=utf-8',
      sessionDir,
    )
    method = fullResult.method
    report('schedule-full.json')
    if (!sessionDir) await sleep(180)
  }

  for (const group of groups) {
    const safeCode = safeExportFileName(group.code)
    const doc = buildGroupPrintDocument(schedule, group)
    const basePath = sessionDir ? `groups/${safeCode}` : `${sessionName}_${safeCode}`

    if (options.includeGroupJson) {
      const jsonResult = await writeExportFile(
        sessionDir ? `${basePath}.json` : `${basePath}.json`,
        JSON.stringify(doc, null, 2),
        'application/json;charset=utf-8',
        sessionDir,
      )
      method = jsonResult.method
      report(`${group.code}.json`)
      if (!sessionDir) await sleep(180)
    }

    if (options.includeGroupHtml) {
      const htmlResult = await writeExportFile(
        sessionDir ? `${basePath}.html` : `${basePath}.html`,
        buildPrintScheduleHtml(doc),
        'text/html;charset=utf-8',
        sessionDir,
      )
      method = htmlResult.method
      report(`${group.code}.html`)
      if (!sessionDir) await sleep(180)
    }
  }

  const rootFolder = loadExportLocationPrefs().folderLabel

  return {
    groups: groups.length,
    files: done,
    method,
    sessionFolder,
    folderLabel: method === 'folder' ? `${rootFolder ?? 'папка'}/${sessionFolder}` : undefined,
  }
}
