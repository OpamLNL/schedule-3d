import { useCallback, useEffect, useId, useState } from 'react'
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
      onImportText: (text: string) => Promise<void>
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
  onImportText: (text: string) => Promise<void>
  onExportCurrent?: (label: string, note: string) => void
  onExportCurrentTxt?: (label: string, note: string) => void
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

function JsonImportControls({
  busy,
  canExportCurrent,
  exportLabel,
  onExportCurrent,
  onExportCurrentTxt,
  onImport,
  onImportText,
  pasteHint,
}: {
  busy: boolean
  canExportCurrent?: boolean
  exportLabel: string
  onExportCurrent: () => void
  onExportCurrentTxt?: () => void
  onImport: (file: File) => Promise<void>
  onImportText: (text: string) => Promise<void>
  pasteHint: string
}) {
  const fileInputId = useId()
  const [importError, setImportError] = useState<string | null>(null)
  const [pasteOpen, setPasteOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')

  const runImport = useCallback(
    async (task: () => Promise<void>) => {
      setImportError(null)
      try {
        await task()
        setPasteText('')
        setPasteOpen(false)
      } catch (err) {
        setImportError(err instanceof Error ? err.message : 'Помилка імпорту')
      }
    },
    [],
  )

  return (
    <>
      <button
        type="button"
        className="btn"
        disabled={busy || canExportCurrent === false}
        onClick={onExportCurrent}
      >
        {exportLabel}
      </button>
      {onExportCurrentTxt ? (
        <button
          type="button"
          className="btn"
          disabled={busy || canExportCurrent === false}
          onClick={onExportCurrentTxt}
        >
          Експорт TXT
        </button>
      ) : null}
      <label htmlFor={fileInputId} className={`btn document-versions-file-label${busy ? ' disabled' : ''}`}>
        Імпорт JSON / TXT
        <input
          id={fileInputId}
          type="file"
          accept=".json,.txt,application/json,text/plain"
          className="document-versions-file-input"
          disabled={busy}
          onChange={(e) => {
            const file = e.target.files?.[0]
            e.target.value = ''
            if (file) void runImport(() => onImport(file))
          }}
        />
      </label>
      <button type="button" className="btn" disabled={busy} onClick={() => setPasteOpen((open) => !open)}>
        {pasteOpen ? 'Сховати вставку' : 'Вставити JSON'}
      </button>
      {importError ? <p className="warn-banner document-versions-import-error">{importError}</p> : null}
      {pasteOpen ? (
        <div className="document-versions-paste">
          <p className="muted document-versions-hint">{pasteHint}</p>
          <textarea
            className="document-versions-paste-input"
            rows={8}
            placeholder='{"type":"schedule3d-schedule-v1", ...} або {"meta":..., "groups":...}'
            value={pasteText}
            disabled={busy}
            onChange={(e) => setPasteText(e.target.value)}
          />
          <button
            type="button"
            className="btn primary"
            disabled={busy || !pasteText.trim()}
            onClick={() => void runImport(() => onImportText(pasteText))}
          >
            Завантажити з тексту
          </button>
        </div>
      ) : null}
    </>
  )
}

export function DocumentVersionsPanel(props: DocumentVersionsPanelProps) {
  const [label, setLabel] = useState('')
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)

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

  const wrapImport =
    (task: () => Promise<void>) =>
    async () => {
      setBusy(true)
      try {
        await task()
        await props.onRefresh()
      } finally {
        setBusy(false)
      }
    }

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
              <JsonImportControls
                busy={busy}
                canExportCurrent={props.canExportCurrent}
                exportLabel="Експорт JSON"
                onExportCurrent={() => props.onExportCurrent(label, note)}
                onImport={(file) => wrapImport(() => props.onImport(file))()}
                onImportText={(text) => wrapImport(() => props.onImportText(text))()}
                pasteHint="На Android файловий вибір часто не працює. Відкрийте JSON на компʼютері або в Drive → скопіюйте весь текст → вставте сюди."
              />
            ) : null}
            {props.kind === 'schedule' ? (
              <JsonImportControls
                busy={busy}
                canExportCurrent={props.canExportCurrent}
                exportLabel="Експорт JSON"
                onExportCurrent={() => props.onExportCurrent?.(label, note)}
                onExportCurrentTxt={
                  props.onExportCurrentTxt ? () => props.onExportCurrentTxt?.(label, note) : undefined
                }
                onImport={(file) => wrapImport(() => props.onImport(file))()}
                onImportText={(text) => wrapImport(() => props.onImportText(text))()}
                pasteHint="На Android збережіть розклад як .txt (кнопка «Експорт TXT») — всередині той самий JSON. Або вставте текст сюди."
              />
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
          Для Android: на компʼютері <strong>Експорт TXT</strong> → закиньте <code>.txt</code> на телефон →{' '}
          <strong>Імпорт JSON / TXT</strong>. Вміст той самий, що в <code>.json</code>. Також можна перейменувати{' '}
          <code>.json</code> на <code>.txt</code> вручну.
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
