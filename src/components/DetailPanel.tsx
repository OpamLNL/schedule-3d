import type { Group, SelectedCell } from '../types/schedule'
import { conflictReasonBetween, conflictReasonLabel, describeConflictEntry } from '../utils/conflicts'

type DetailPanelProps = {
  selected: SelectedCell | null
  groups: Group[]
  compact?: boolean
  layout?: 'panel' | 'bar'
}

function ConflictReasonTag({ reason }: { reason: ReturnType<typeof conflictReasonBetween> }) {
  return (
    <span className={`conflict-reason-tag conflict-reason-${reason}`} title={`Причина: ${conflictReasonLabel(reason)}`}>
      {conflictReasonLabel(reason)}
    </span>
  )
}

export function DetailPanel({ selected, groups, compact = false, layout = 'panel' }: DetailPanelProps) {
  const groupById = new Map(groups.map((group) => [group.id, group]))

  if (layout === 'bar') {
    return (
      <div className="selected-pair-bar panel" aria-live="polite">
        <span className="selected-pair-bar-label">Обрана пара</span>
        {!selected ? (
          <span className="muted selected-pair-bar-empty">
            Клікніть на комірку циліндра, щоб переглянути деталі.
          </span>
        ) : (
          <>
            <dl className="selected-pair-bar-fields">
              <div>
                <dt>Група</dt>
                <dd>{selected.group.name}</dd>
              </div>
              <div>
                <dt>Слот</dt>
                <dd>{selected.slotLabel}</dd>
              </div>
              <div>
                <dt>Предмет</dt>
                <dd>{selected.entry.subject}</dd>
              </div>
              <div>
                <dt>Викладач</dt>
                <dd>{selected.entry.teacher}</dd>
              </div>
              <div>
                <dt>Аудиторія</dt>
                <dd>{selected.entry.room}</dd>
              </div>
            </dl>
            {selected.conflicts.length > 0 ? (
              <div className="selected-pair-bar-conflicts">
                <span className="selected-pair-bar-conflicts-label">Накладка з:</span>
                <ul className="selected-pair-bar-conflicts-list">
                  {selected.conflicts.map((conflict) => {
                    const reason = conflictReasonBetween(selected.entry, conflict)
                    return (
                      <li key={conflict.id}>
                        <ConflictReasonTag reason={reason} />
                        <span>{describeConflictEntry(conflict, groupById)}</span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            ) : (
              <span className="selected-pair-bar-ok">Без накладок</span>
            )}
          </>
        )}
      </div>
    )
  }

  return (
    <aside className={compact ? 'panel detail-panel detail-panel-compact' : 'panel detail-panel'}>
      <h2>{compact ? 'Обрана пара' : 'Деталі заняття'}</h2>
      {!selected ? (
        <p className="muted">Клікніть на комірку циліндра, щоб переглянути предмет, викладача та накладки.</p>
      ) : (
        <>
          <dl>
            <div>
              <dt>Група</dt>
              <dd>{selected.group.name}</dd>
            </div>
            <div>
              <dt>Слот</dt>
              <dd>{selected.slotLabel}</dd>
            </div>
            <div>
              <dt>Предмет</dt>
              <dd>{selected.entry.subject}</dd>
            </div>
            <div>
              <dt>Викладач</dt>
              <dd>{selected.entry.teacher}</dd>
            </div>
            <div>
              <dt>Аудиторія</dt>
              <dd>{selected.entry.room}</dd>
            </div>
          </dl>

          {selected.conflicts.length > 0 ? (
            <div className="conflicts-block">
              <h3>Накладки</h3>
              <ul>
                {selected.conflicts.map((conflict) => {
                  const reason = conflictReasonBetween(selected.entry, conflict)
                  return (
                    <li key={conflict.id}>
                      <ConflictReasonTag reason={reason} />
                      {describeConflictEntry(conflict, groupById)}
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : (
            <p className="ok">Конфліктів для цього слоту не знайдено.</p>
          )}
        </>
      )}
    </aside>
  )
}
