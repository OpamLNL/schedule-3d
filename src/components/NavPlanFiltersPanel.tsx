import type { NavPlanFilters } from '../types/planning'
import { defaultNavPlanFilters, hasActiveNavPlanFilters } from '../utils/navPlanFilters'

type NavPlanFiltersPanelProps = {
  filters: NavPlanFilters
  onChange: (filters: NavPlanFilters) => void
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
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function NavPlanFiltersPanel({ filters, onChange }: NavPlanFiltersPanelProps) {
  const patch = (partial: Partial<NavPlanFilters>) => onChange({ ...filters, ...partial })

  return (
    <div className="nav-plan-filters">
      <TextFilter
        label="Група"
        value={filters.groupCode}
        placeholder="КН31…"
        onChange={(groupCode) => patch({ groupCode })}
      />

      <TextFilter
        label="Предмет"
        value={filters.subject}
        placeholder="частина назви"
        className="filter-subject"
        onChange={(subject) => patch({ subject })}
      />

      <TextFilter
        label="Викладач"
        value={filters.teacher}
        placeholder="прізвище"
        onChange={(teacher) => patch({ teacher })}
      />

      <TextFilter
        label="Екзамен"
        value={filters.exams}
        placeholder="є / немає"
        onChange={(exams) => patch({ exams })}
      />

      <TextFilter
        label="Залік"
        value={filters.credits}
        placeholder="є / немає"
        onChange={(credits) => patch({ credits })}
      />

      <TextFilter
        label="Лекції"
        value={filters.lectures}
        placeholder="є / немає"
        onChange={(lectures) => patch({ lectures })}
      />

      <label className="filter-inline filter-num">
        <span>Заг. від</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={filters.hoursTotalMin}
          placeholder="0"
          onChange={(e) => patch({ hoursTotalMin: e.target.value })}
        />
      </label>

      <label className="filter-inline filter-num">
        <span>Заг. до</span>
        <input
          type="number"
          min={0}
          inputMode="numeric"
          value={filters.hoursTotalMax}
          placeholder="∞"
          onChange={(e) => patch({ hoursTotalMax: e.target.value })}
        />
      </label>

      <label className="filter-inline filter-search">
        <span>Пошук</span>
        <input
          type="search"
          value={filters.query}
          onChange={(e) => patch({ query: e.target.value })}
          placeholder="будь-де в рядку"
        />
      </label>

      <label className="checkbox-row filter-inline">
        <input
          type="checkbox"
          checked={filters.onlyWithTeacher}
          onChange={(e) => patch({ onlyWithTeacher: e.target.checked })}
        />
        <span>Лише з викладачем</span>
      </label>

      {hasActiveNavPlanFilters(filters) ? (
        <button type="button" className="btn" onClick={() => onChange(defaultNavPlanFilters)}>
          Скинути
        </button>
      ) : null}
    </div>
  )
}
