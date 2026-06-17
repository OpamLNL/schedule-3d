import { TeacherCombobox } from './TeacherCombobox'

export type TableFilterField = {
  key: string
  label: string
  placeholder?: string
  className?: string
  suggestions?: string[]
  searchMode?: 'teacher' | 'text'
}

type TableTextFiltersProps = {
  fields: TableFilterField[]
  values: Record<string, string>
  onChange: (key: string, value: string) => void
  onReset?: () => void
  queryKey?: string
  queryLabel?: string
  queryPlaceholder?: string
}

export function TableTextFilters({
  fields,
  values,
  onChange,
  onReset,
  queryKey = 'query',
  queryLabel = 'Пошук',
  queryPlaceholder = 'будь-де в рядку',
}: TableTextFiltersProps) {
  const hasActive = Object.values(values).some((value) => value.trim().length > 0)

  return (
    <div className="nav-plan-filters table-text-filters">
      {fields.map((field) => (
        <label key={field.key} className={`filter-inline ${field.className ?? ''}`.trim()}>
          <span>{field.label}</span>
          {field.suggestions ? (
            <TeacherCombobox
              value={values[field.key] ?? ''}
              placeholder={field.placeholder}
              options={field.suggestions}
              searchMode={field.searchMode}
              onChange={(next) => onChange(field.key, next)}
            />
          ) : (
            <input
              type="search"
              value={values[field.key] ?? ''}
              placeholder={field.placeholder}
              onChange={(e) => onChange(field.key, e.target.value)}
            />
          )}
        </label>
      ))}

      <label className="filter-inline filter-search">
        <span>{queryLabel}</span>
        <input
          type="search"
          value={values[queryKey] ?? ''}
          placeholder={queryPlaceholder}
          onChange={(e) => onChange(queryKey, e.target.value)}
        />
      </label>

      {hasActive && onReset ? (
        <button type="button" className="btn" onClick={onReset}>
          Скинути
        </button>
      ) : null}
    </div>
  )
}
