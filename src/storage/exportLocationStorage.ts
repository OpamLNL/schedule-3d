import { idbGetFile, idbSetFile } from './documentStorage'

export type ExportLocationMode = 'downloads' | 'folder'

export type ExportLocationPrefs = {
  mode: ExportLocationMode
  folderLabel?: string
}

const PREFS_KEY = 'schedule3d-export-location-v1'
const HANDLE_KEY = 'exportDirectoryHandle'

export function loadExportLocationPrefs(): ExportLocationPrefs {
  try {
    const raw = localStorage.getItem(PREFS_KEY)
    if (!raw) return { mode: 'downloads' }
    const parsed = JSON.parse(raw) as ExportLocationPrefs
    return {
      mode: parsed.mode === 'folder' ? 'folder' : 'downloads',
      folderLabel: parsed.folderLabel,
    }
  } catch {
    return { mode: 'downloads' }
  }
}

export function saveExportLocationPrefs(prefs: ExportLocationPrefs): void {
  localStorage.setItem(PREFS_KEY, JSON.stringify(prefs))
}

export function isFolderExportSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window
}

export async function getStoredExportFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  if (!isFolderExportSupported()) return null
  const handle = await idbGetFile<FileSystemDirectoryHandle>(HANDLE_KEY)
  return handle ?? null
}

async function verifyFolderPermission(handle: FileSystemDirectoryHandle): Promise<boolean> {
  const opts = { mode: 'readwrite' as const }
  if ((await handle.queryPermission(opts)) === 'granted') return true
  return (await handle.requestPermission(opts)) === 'granted'
}

export async function pickExportFolder(): Promise<ExportLocationPrefs | null> {
  if (!isFolderExportSupported()) return null
  const handle = await window.showDirectoryPicker({ mode: 'readwrite' })
  const allowed = await verifyFolderPermission(handle)
  if (!allowed) return null
  await idbSetFile(HANDLE_KEY, handle)
  const prefs: ExportLocationPrefs = { mode: 'folder', folderLabel: handle.name }
  saveExportLocationPrefs(prefs)
  return prefs
}

export async function resolveExportFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  const prefs = loadExportLocationPrefs()
  if (prefs.mode !== 'folder') return null
  const handle = await getStoredExportFolderHandle()
  if (!handle) return null
  const allowed = await verifyFolderPermission(handle)
  return allowed ? handle : null
}

export async function clearExportFolder(): Promise<void> {
  saveExportLocationPrefs({ mode: 'downloads' })
  await idbSetFile(HANDLE_KEY, null)
}
