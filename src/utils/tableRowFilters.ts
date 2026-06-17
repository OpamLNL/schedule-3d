import { matchesAnyText } from './filterTerms'

export function filterTableRows<T extends object>(
  rows: T[],
  filters: Record<string, string>,
  fieldKeys: (keyof T)[],
  queryKey = 'query',
): T[] {
  const query = filters[queryKey]?.trim() ?? ''
  const activeFields = fieldKeys.filter((key) => {
    const value = filters[String(key)]?.trim()
    return Boolean(value)
  })

  if (activeFields.length === 0 && !query) return rows

  return rows.filter((row) => {
    for (const key of activeFields) {
      const filterVal = filters[String(key)] ?? ''
      if (!matchesAnyText(String(row[key] ?? ''), filterVal)) return false
    }
    if (query) {
      const haystack = fieldKeys.map((key) => String(row[key] ?? '')).join(' ')
      if (!matchesAnyText(haystack, query)) return false
    }
    return true
  })
}
