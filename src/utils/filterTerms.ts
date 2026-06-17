/** Розбиває фільтр на частини через кому або крапку з комою. */
export function splitFilterTerms(filter: string): string[] {
  return filter
    .split(/[,;]+/)
    .map((part) => part.trim())
    .filter(Boolean)
}

export function hasFilterTerms(filter: string): boolean {
  return splitFilterTerms(filter).length > 0
}

function matchesSingleText(haystack: string, term: string): boolean {
  const q = term.trim().toLowerCase()
  if (!q) return true
  return haystack.toLowerCase().includes(q)
}

/** Будь-який термін збігається (OR). Порожній фільтр = усі. */
export function matchesAnyText(haystack: string, filter: string): boolean {
  const terms = splitFilterTerms(filter)
  if (terms.length === 0) return true
  return terms.some((term) => matchesSingleText(haystack, term))
}

export function matchesAnyTerm<T>(
  filter: string,
  matcher: (item: T, term: string) => boolean,
  item: T,
): boolean {
  const terms = splitFilterTerms(filter)
  if (terms.length === 0) return true
  return terms.some((term) => matcher(item, term))
}

export function filterTextOptions(options: string[], query: string, limit = 40): string[] {
  const q = query.trim()
  const filtered = q ? options.filter((opt) => matchesAnyText(opt, q)) : options
  return filtered.slice(0, limit)
}
