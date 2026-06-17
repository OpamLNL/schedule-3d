import type { Filters, Group } from '../types/schedule'
import { defaultScheduleFilters, hasActiveScheduleFilters } from '../utils/scheduleFilters'

type FilterPanelProps = {
  filters: Filters
  visibleGroups: Group[]
  visibleEntriesCount: number
  conflictCount: number
  onChange: (patch: Partial<Filters>) => void
  onReset: () => void
}

function TextFilter({
  label,
  value,
  placeholder,
  className,
  onChange,
}: {
  label: string
  value: string
  placeholder?: string
  className?: string
  onChange: (value: string) => void
}) {
  return (
    <label className={`filter-inline ${className ?? ''}`.trim()}>
      <span>{label}</span>
      <input type="search" value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

export function FilterPanel({
  filters,
  visibleGroups,
  visibleEntriesCount,
  conflictCount,
  onChange,
  onReset,
}: FilterPanelProps) {
  return (
    <div className="cylinder-filters panel">
      <TextFilter
        label="Спеціальність"
        value={filters.specialty}
        placeholder="кн, зв…"
        className="filter-specialty"
        onChange={(specialty) => onChange({ specialty })}
      />

      <TextFilter
        label="Курс"
        value={filters.course}
        placeholder="1, 2, 3…"
        className="filter-course"
        onChange={(course) => onChange({ course })}
      />

      <TextFilter
        label="Група"
        value={filters.groupCode}
        placeholder="кн, зв…"
        onChange={(groupCode) => onChange({ groupCode })}
      />

      <TextFilter
        label="Викладач"
        value={filters.teacher}
        placeholder="лінчук, горват…"
        className="filter-teacher"
        onChange={(teacher) => onChange({ teacher })}
      />

      <TextFilter
        label="День"
        value={filters.day}
        placeholder="Пн, Вт…"
        className="filter-day"
        onChange={(day) => onChange({ day })}
      />

      <label className="checkbox-row filter-inline cylinder-filter-checkbox">
        <input
          type="checkbox"
          checked={filters.conflictsOnly}
          onChange={(event) => onChange({ conflictsOnly: event.target.checked })}
        />
        <span>Тільки накладки</span>
      </label>

      {hasActiveScheduleFilters(filters) ? (
        <button type="button" className="btn cylinder-filter-reset" onClick={onReset}>
          Скинути
        </button>
      ) : null}

      <div className="cylinder-filter-stats">
        <span>Груп: {visibleGroups.length}</span>
        <span>Занять: {visibleEntriesCount}</span>
        <span>Накладок: {conflictCount}</span>
      </div>
    </div>
  )
}

export { defaultScheduleFilters }
