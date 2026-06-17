import { useMemo, useState } from 'react'
import type { ScheduleData } from '../types/schedule'
import {
  clearExportFolder,
  isFolderExportSupported,
  loadExportLocationPrefs,
  pickExportFolder,
  saveExportLocationPrefs,
  type ExportLocationPrefs,
} from '../storage/exportLocationStorage'
import {
  exportScheduleBatch,
  type BatchExportProgress,
  type BatchExportScope,
} from '../utils/batchScheduleExport'

type BatchExportPanelProps = {
  schedule: ScheduleData
  onStatus?: (message: string | null) => void
}

export function BatchExportPanel({ schedule, onStatus }: BatchExportPanelProps) {
  const groups = useMemo(
    () => [...schedule.groups].sort((a, b) => a.code.localeCompare(b.code, 'uk')),
    [schedule.groups],
  )

  const [locationPrefs, setLocationPrefs] = useState<ExportLocationPrefs>(() => loadExportLocationPrefs())
  const [scope, setScope] = useState<BatchExportScope>('all')
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(() => new Set(groups.map((g) => g.code)))
  const [includeFullScheduleJson, setIncludeFullScheduleJson] = useState(true)
  const [includeGroupHtml, setIncludeGroupHtml] = useState(true)
  const [includeGroupJson, setIncludeGroupJson] = useState(true)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState<BatchExportProgress | null>(null)
  const [lastResult, setLastResult] = useState<string | null>(null)

  const folderSupported = isFolderExportSupported()
  const selectedCount = scope === 'all' ? groups.length : selectedGroups.size

  const toggleGroup = (code: string) => {
    setSelectedGroups((current) => {
      const next = new Set(current)
      if (next.has(code)) next.delete(code)
      else next.add(code)
      return next
    })
  }

  const selectAllGroups = () => setSelectedGroups(new Set(groups.map((group) => group.code)))
  const clearGroups = () => setSelectedGroups(new Set())

  const chooseDownloads = () => {
    const prefs: ExportLocationPrefs = { mode: 'downloads' }
    saveExportLocationPrefs(prefs)
    setLocationPrefs(prefs)
    setLastResult(null)
  }

  const chooseFolder = async () => {
    if (!folderSupported) return
    const picked = await pickExportFolder()
    if (!picked) return
    setLocationPrefs(picked)
    setLastResult(`Папка: ${picked.folderLabel ?? 'обрано'}`)
  }

  const resetFolder = async () => {
    await clearExportFolder()
    chooseDownloads()
  }

  const runExport = async () => {
    if (!includeGroupHtml && !includeGroupJson && !includeFullScheduleJson) {
      onStatus?.('Оберіть хоча б один тип файлу для експорту')
      return
    }

    setBusy(true)
    setProgress(null)
    setLastResult(null)
    onStatus?.('Експорт розкладу…')

    try {
      const result = await exportScheduleBatch(
        schedule,
        {
          scope,
          groupCodes: [...selectedGroups],
          includeFullScheduleJson,
          includeGroupHtml,
          includeGroupJson,
        },
        setProgress,
      )

      const message =
        result.method === 'folder'
          ? `Збережено ${result.files} файлів у папку ${result.sessionFolder}`
          : `Завантажено ${result.files} файлів (${result.groups} груп)`
      setLastResult(message)
      onStatus?.(message)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Помилка експорту'
      setLastResult(message)
      onStatus?.(message)
    } finally {
      setBusy(false)
      setProgress(null)
    }
  }

  return (
    <section className="panel section-block batch-export-panel">
      <div className="section-head">
        <h2>Пакетний експорт для друку</h2>
      </div>

      <div className="batch-export-grid">
        <div className="batch-export-block">
          <h3>Куди зберігати</h3>
          <div className="batch-export-location">
            <label className="radio-row">
              <input
                type="radio"
                name="export-location"
                checked={locationPrefs.mode === 'downloads'}
                onChange={chooseDownloads}
              />
              <span>Завантаження браузера</span>
            </label>
            <label className={`radio-row${folderSupported ? '' : ' disabled'}`}>
              <input
                type="radio"
                name="export-location"
                checked={locationPrefs.mode === 'folder'}
                disabled={!folderSupported}
                onChange={() => void chooseFolder()}
              />
              <span>
                Обрана папка
                {locationPrefs.mode === 'folder' && locationPrefs.folderLabel
                  ? `: ${locationPrefs.folderLabel}`
                  : ''}
              </span>
            </label>
          </div>
          <div className="batch-export-location-actions">
            {folderSupported ? (
              <button type="button" className="btn" disabled={busy} onClick={() => void chooseFolder()}>
                Обрати папку…
              </button>
            ) : (
              <p className="muted">Обрання папки недоступне в цьому браузері — файли підуть у «Завантаження».</p>
            )}
            {locationPrefs.mode === 'folder' ? (
              <button type="button" className="btn" disabled={busy} onClick={() => void resetFolder()}>
                Скинути папку
              </button>
            ) : null}
          </div>
          <p className="muted batch-export-hint">
            У режимі папки створюється підпапка <code>schedule-export_дата_час</code> з HTML для друку, JSON і
            manifest.
          </p>
        </div>

        <div className="batch-export-block">
          <h3>Що експортувати</h3>
          <div className="batch-export-scope">
            <label className="radio-row">
              <input
                type="radio"
                name="export-scope"
                checked={scope === 'all'}
                onChange={() => setScope('all')}
              />
              <span>Усі групи ({groups.length})</span>
            </label>
            <label className="radio-row">
              <input
                type="radio"
                name="export-scope"
                checked={scope === 'selected'}
                onChange={() => setScope('selected')}
              />
              <span>Обрані групи ({selectedCount})</span>
            </label>
          </div>

          {scope === 'selected' ? (
            <div className="batch-export-groups">
              <div className="batch-export-groups-actions">
                <button type="button" className="btn" onClick={selectAllGroups}>
                  Усі
                </button>
                <button type="button" className="btn" onClick={clearGroups}>
                  Жодної
                </button>
              </div>
              <div className="batch-export-group-list">
                {groups.map((group) => (
                  <label key={group.id} className="checkbox-row batch-export-group-item">
                    <input
                      type="checkbox"
                      checked={selectedGroups.has(group.code)}
                      onChange={() => toggleGroup(group.code)}
                    />
                    <span>{group.code}</span>
                  </label>
                ))}
              </div>
            </div>
          ) : null}

          <div className="batch-export-formats">
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={includeFullScheduleJson}
                onChange={(e) => setIncludeFullScheduleJson(e.target.checked)}
              />
              <span>JSON усього розкладу</span>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={includeGroupHtml}
                onChange={(e) => setIncludeGroupHtml(e.target.checked)}
              />
              <span>HTML для друку по групах</span>
            </label>
            <label className="checkbox-row">
              <input
                type="checkbox"
                checked={includeGroupJson}
                onChange={(e) => setIncludeGroupJson(e.target.checked)}
              />
              <span>JSON по групах</span>
            </label>
          </div>
        </div>
      </div>

      <div className="batch-export-footer">
        <button type="button" className="btn primary" disabled={busy || selectedCount === 0} onClick={() => void runExport()}>
          {busy ? 'Зберігаємо…' : `Зберегти пакет (${selectedCount} груп)`}
        </button>
        {progress ? (
          <span className="muted">
            {progress.done}/{progress.total} · {progress.label}
          </span>
        ) : null}
        {lastResult ? <span className="batch-export-result">{lastResult}</span> : null}
      </div>
    </section>
  )
}
