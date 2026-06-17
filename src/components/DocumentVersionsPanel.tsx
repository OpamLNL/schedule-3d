import { useCallback, useEffect, useRef, useState } from 'react'
import type { NavPlanSnapshot, PrintScheduleDocument, ScheduleDocument } from '../types/documents'

type SnapshotItem = NavPlanSnapshot
type ScheduleItem = ScheduleDocument
type PrintItem = PrintScheduleDocument

type DocumentVersionsPanelProps =
  | {
      kind: 'navPlan'
      items: SnapshotItem[]
      onRefresh: () => Promise<void>
      onSave: (label: string, note: string) => Promise<void>
      onRestore: (id: string) => Promise<void>
      onDelete: (id: string) => Promise<void>
      onExport: (item: SnapshotItem) => void
      onExportCurrent: (label: string, note: string) => void
      onImport: (file: File) => Promise<void>
      canExportCurrent?: boolean
    }
  | {
      kind: 'schedule'
      items: ScheduleItem[]
      onRefresh: () => Promise<void>
      onSave: (label: string, note: string) => Promise<void>
      onLoad: (id: string) => Promise<void>
      onDelete: (id: string) => Promise<void>
      onExport: (item: ScheduleItem) => void
      onImport: (file: File) => Promise<void>
      onExportCurrent?: (label: string, note: string) => void
      canExportCurrent?: boolean
    }
  | {
      kind: 'print'
      items: PrintItem[]
      onRefresh: () => Promise<void>
      onDelete: (id: string) => Promise<void>
      onPrint: (item: PrintItem) => void
      onExport: (item: PrintItem) => void
    }

export function DocumentVersionsPanel(props: DocumentVersionsPanelProps) {
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const importRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    void props.onRefresh()
  }, [props.kind])

  const titles = {
    navPlan: 'Версії навплану',
    schedule: 'Збережені розклади',
    print: 'Розклади для друку',
  }

  const handleSave = useCallback(async () => {
    if (props.kind === 'print') return
    setBusy(true)
    try {
      await props.onSave(label, note)
      setLabel('')
      setNote('')
      await props.onRefresh()
    } finally {
      setBusy(false)
    }
  }, [props, label, note])

  const handleImportFile = useCallback(
    async (file: File | undefined) => {
      if (!file || (props.kind !== 'navPlan' && props.kind !== 'schedule')) return
      setBusy(true)
      try {
        await props.onImport(file)
      } finally {
        setBusy(false)
        if (importRef.current) importRef.current.value = ''
      }
    },
    [props],
  )

  return (
    <section className="panel section-block document-versions document-versions-top">
      <div className="document-versions-head">
        <h2>{titles[props.kind]}</h2>
        {props.kind !== 'print' ? (
          <div className="document-versions-save">
            <input
              type="text"
              placeholder="Назва версії"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
            <input
              type="text"
              placeholder="Примітка (необовʼязково)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
            <button type="button" className="btn primary" disabled={busy} onClick={() => void handleSave()}>
              Зберегти версію
            </button>
            {props.kind === 'navPlan' ? (
              <>
                <button
                  type="button"
                  className="btn"
                  disabled={busy || props.canExportCurrent === false}
                  onClick={() => props.onExportCurrent(label, note)}
                >
                  Експорт JSON
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={(e) => void handleImportFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => importRef.current?.click()}
                >
                  Імпорт JSON
                </button>
              </>
            ) : null}
            {props.kind === 'schedule' ? (
              <>
                <button
                  type="button"
                  className="btn"
                  disabled={busy || props.canExportCurrent === false}
                  onClick={() => props.onExportCurrent?.(label, note)}
                >
                  Експорт JSON
                </button>
                <input
                  ref={importRef}
                  type="file"
                  accept=".json,application/json"
                  hidden
                  onChange={(e) => void handleImportFile(e.target.files?.[0])}
                />
                <button
                  type="button"
                  className="btn"
                  disabled={busy}
                  onClick={() => importRef.current?.click()}
                >
                  Імпорт JSON
                </button>
              </>
            ) : null}
          </div>
        ) : null}
      </div>

      {props.kind === 'navPlan' ? (
        <p className="muted document-versions-hint">
          JSON містить <code>savedBy</code>, <code>savedAt</code>, назву та дані навплану. Імпорт завантажує файл у
          поточну таблицю.
        </p>
      ) : null}
      {props.kind === 'schedule' ? (
        <p className="muted document-versions-hint">
          Підтримуються <code>schedule-full.json</code> з пакетного експорту, збережені версії та JSON поточного
          розкладу. Після імпорту розклад одразу доступний у 3D і для друку.
        </p>
      ) : null}

      {props.items.length === 0 ? (
        <p className="muted">Поки немає збережених записів.</p>
      ) : (
        <ul className="document-versions-list">
          {props.items.map((item) => (
            <li key={item.id}>
              <div className="document-versions-main">
                <strong>{'label' in item ? item.label : item.title}</strong>
                <span className="muted document-versions-meta">
                  {new Date(item.savedAt).toLocaleString('uk-UA')} · {item.savedBy}
                  {'version' in item ? ` · v${item.version}` : ''}
                  {'rowCount' in item ? ` · ${item.rowCount} рядків` : ''}
                  {'stats' in item
                    ? ` · ${item.stats.entries} пар · ${item.stats.conflicts} накладок${item.edited ? ' · редаговано' : ''}`
                    : ''}
                  {'kind' in item && item.kind ? ` · ${item.kind === 'group' ? 'група' : 'викладач'} ${item.targetName}` : ''}
                </span>
                {'note' in item && item.note ? <span className="document-versions-note">{item.note}</span> : null}
              </div>
              <div className="document-versions-actions">
                {props.kind === 'navPlan' ? (
                  <button type="button" className="btn" onClick={() => void props.onRestore(item.id)}>
                    Завантажити
                  </button>
                ) : null}
                {props.kind === 'schedule' ? (
                  <button type="button" className="btn" onClick={() => void props.onLoad(item.id)}>
                    Відкрити
                  </button>
                ) : null}
                {props.kind === 'print' ? (
                  <button type="button" className="btn primary" onClick={() => props.onPrint(item)}>
                    Друкувати
                  </button>
                ) : null}
                {props.kind !== 'print' ? (
                  <button type="button" className="btn" onClick={() => props.onExport(item as never)}>
                    Експорт
                  </button>
                ) : (
                  <button type="button" className="btn" onClick={() => props.onExport(item)}>
                    JSON
                  </button>
                )}
                <button
                  type="button"
                  className="btn btn-danger-text"
                  onClick={() => void props.onDelete(item.id).then(() => props.onRefresh())}
                >
                  Видалити
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
