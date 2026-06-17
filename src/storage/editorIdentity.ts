const EDITOR_KEY = 'schedule3d-editor-name'

export function getEditorName(): string {
  try {
    return localStorage.getItem(EDITOR_KEY)?.trim() || ''
  } catch {
    return ''
  }
}

export function setEditorName(name: string): void {
  try {
    localStorage.setItem(EDITOR_KEY, name.trim())
  } catch {
    // ignore
  }
}

/** Запитує ПІБ один раз і зберігає для подальших версій. */
export function ensureEditorName(): string {
  const existing = getEditorName()
  if (existing) return existing
  const entered = window.prompt('Ваше прізвище або ПІБ (для журналу змін):', '')?.trim()
  if (!entered) return 'Невідомий'
  setEditorName(entered)
  return entered
}
