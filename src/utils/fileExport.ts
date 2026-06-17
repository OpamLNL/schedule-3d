import {
  loadExportLocationPrefs,
  resolveExportFolderHandle,
  type ExportLocationMode,
} from '../storage/exportLocationStorage'

export function safeExportFileName(value: string): string {
  return (
    String(value ?? '')
      .trim()
      .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
      .replace(/\s+/g, '_')
      .replace(/_+/g, '_')
      .slice(0, 80) || 'export'
  )
}

export function exportSessionFolderName(prefix = 'schedule-export'): string {
  const now = new Date()
  const date = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '-')
  return `${prefix}_${date}_${time}`
}

function triggerBrowserDownload(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

async function getOrCreateSubdirectory(
  root: FileSystemDirectoryHandle,
  pathParts: string[],
): Promise<FileSystemDirectoryHandle> {
  let current = root
  for (const part of pathParts) {
    if (!part) continue
    current = await current.getDirectoryHandle(part, { create: true })
  }
  return current
}

async function writeToFolder(
  root: FileSystemDirectoryHandle,
  relativePath: string,
  content: string,
): Promise<void> {
  const normalized = relativePath.replace(/\\/g, '/').replace(/^\/+/, '')
  const parts = normalized.split('/')
  const fileName = parts.pop()
  if (!fileName) throw new Error('Invalid export path')

  const dir = parts.length > 0 ? await getOrCreateSubdirectory(root, parts) : root
  const fileHandle = await dir.getFileHandle(fileName, { create: true })
  const writable = await fileHandle.createWritable()
  await writable.write(content)
  await writable.close()
}

export type WriteExportFileResult = {
  method: ExportLocationMode
  path: string
}

export async function writeExportFile(
  relativePath: string,
  content: string,
  mimeType = 'text/plain;charset=utf-8',
  folderRoot?: FileSystemDirectoryHandle | null,
): Promise<WriteExportFileResult> {
  const prefs = loadExportLocationPrefs()
  const handle = folderRoot ?? (prefs.mode === 'folder' ? await resolveExportFolderHandle() : null)

  if (handle) {
    await writeToFolder(handle, relativePath, content)
    return { method: 'folder', path: relativePath }
  }

  const fileName = relativePath.replace(/\\/g, '/').split('/').pop() ?? relativePath
  triggerBrowserDownload(fileName, content, mimeType)
  return { method: 'downloads', path: fileName }
}

export async function createExportSessionDirectory(): Promise<FileSystemDirectoryHandle | null> {
  const root = await resolveExportFolderHandle()
  if (!root) return null
  return root.getDirectoryHandle(exportSessionFolderName(), { create: true })
}
