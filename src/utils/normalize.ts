export function normalizeGroupCode(value: string): string {
  return String(value ?? '')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, '')
}

export function normalizeSubjectKey(value: string): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/\*+/g, '')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** «О.О.» → «О. О.», «Є.М» → «Є. М» */
export function formatTeacherInitials(value: string): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\.(?=[A-ZА-ЯІЇЄҐ])/gi, '. ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function normalizeTeacher(value: string): string | null {
  let teacher = formatTeacherInitials(String(value ?? ''))
  if (!teacher || teacher === 'В' || teacher.length < 3) return null
  if (teacher.toLowerCase().includes('прізвище') || teacher.toLowerCase().includes('викладач')) return null
  teacher = formatTeacherInitials(teacher.replace(/^В\s+/, '').trim())
  return teacher || null
}

/** Для поля навплану: завжди форматує ініціали, навіть якщо рядок короткий. */
export function normalizeTeacherField(value: string): string {
  const trimmed = String(value ?? '').trim()
  if (!trimmed || trimmed === 'В') return ''
  const normalized = normalizeTeacher(trimmed)
  if (normalized) return normalized
  return formatTeacherInitials(trimmed.replace(/^В\s+/, '').trim())
}

export function parseNumber(value: unknown): number {
  if (value === null || value === undefined || value === '') return 0
  const n = Number(String(value).replace(',', '.').replace(/\s/g, ''))
  return Number.isFinite(n) ? n : 0
}

export function newId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}
