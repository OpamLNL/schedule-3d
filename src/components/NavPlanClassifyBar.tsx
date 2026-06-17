import type { NavPlanKindFilter, NavPlanRow } from '../types/planning'
import { NAV_PLAN_KIND_LABELS, summarizeNavPlanByKind } from '../utils/navPlanClassify'
import type { NavPlanRowKind } from '../types/planning'

type NavPlanClassifyBarProps = {
  rows: NavPlanRow[]
  active: NavPlanKindFilter
  onSelect: (kind: NavPlanKindFilter) => void
}

const CHIP_ORDER: NavPlanRowKind[] = [
  'schedule',
  'coursework',
  'course_project',
  'practice',
  'supervision',
  'diploma',
  'consultation',
  'unknown',
]

export function NavPlanClassifyBar({ rows, active, onSelect }: NavPlanClassifyBarProps) {
  const counts = summarizeNavPlanByKind(rows)
  const excluded = rows.length - counts.schedule

  return (
    <div className="nav-plan-classify-bar" role="tablist" aria-label="Викладки навплану">
      <button
        type="button"
        className={active === 'schedule' ? 'classify-chip active' : 'classify-chip'}
        onClick={() => onSelect('schedule')}
      >
        У розклад
        <span className="classify-count">{counts.schedule}</span>
      </button>
      <button
        type="button"
        className={active === 'excluded' ? 'classify-chip active' : 'classify-chip'}
        onClick={() => onSelect('excluded')}
      >
        Виключені
        <span className="classify-count">{excluded}</span>
      </button>
      <button
        type="button"
        className={active === 'all' ? 'classify-chip active' : 'classify-chip'}
        onClick={() => onSelect('all')}
      >
        Усі
        <span className="classify-count">{rows.length}</span>
      </button>
      <span className="classify-divider" aria-hidden="true" />
      {CHIP_ORDER.filter((kind) => kind !== 'schedule' && counts[kind] > 0).map((kind) => (
        <button
          key={kind}
          type="button"
          className={active === kind ? 'classify-chip active muted-chip' : 'classify-chip muted-chip'}
          onClick={() => onSelect(kind)}
        >
          {NAV_PLAN_KIND_LABELS[kind]}
          <span className="classify-count">{counts[kind]}</span>
        </button>
      ))}
    </div>
  )
}
