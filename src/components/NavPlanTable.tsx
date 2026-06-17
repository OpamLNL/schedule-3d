import type { NavPlanRow } from '../types/planning'
import { normalizeNavPlanRow } from '../utils/parseNavPlan'

type NavPlanTableProps = {
  rows: NavPlanRow[]
  onChange: (id: string, key: keyof NavPlanRow, value: string | number) => void
  onDelete?: (id: string) => void
  emptyText?: string
}

type NumCol = { key: keyof NavPlanRow; title: string }

const SHARED_COLS: NumCol[] = [
  { key: 'hoursTotal', title: 'Заг. обсяг' },
  { key: 'hoursCourse', title: 'На курсі' },
  { key: 'hoursSelf', title: 'Сам. роб.' },
]

const FALL_COLS: NumCol[] = [
  { key: 'fallLectures', title: 'Лекції' },
  { key: 'fallPractical', title: 'Практ.' },
  { key: 'fallLab', title: 'Лаб.' },
  { key: 'fallCoursework', title: 'Курсові' },
  { key: 'fallConsult', title: 'Консульт.' },
  { key: 'fallCredits', title: 'Заліки' },
  { key: 'fallExams', title: 'Екзамени' },
  { key: 'hoursFall', title: 'За сем.' },
]

const SPRING_COLS: NumCol[] = [
  { key: 'springLectures', title: 'Лекції' },
  { key: 'springPractical', title: 'Практ.' },
  { key: 'springLab', title: 'Лаб.' },
  { key: 'springCoursework', title: 'Курсові' },
  { key: 'springConsult', title: 'Консульт.' },
  { key: 'springSupervised', title: 'Кер. пр.' },
  { key: 'springCredits', title: 'Заліки' },
  { key: 'springExams', title: 'Екзамени' },
  { key: 'springDpa', title: 'ДПА' },
  { key: 'springDkk', title: 'ДКК' },
  { key: 'hoursSpring', title: 'За сем.' },
]

const YEAR_COLS: NumCol[] = [
  { key: 'budget', title: 'Бюджет' },
  { key: 'extraBudget', title: 'Позаб.' },
]

function numValue(value: number): string {
  return value === 0 ? '' : String(value)
}

function NumCell({
  rowId,
  field,
  value,
  tone,
  onChange,
}: {
  rowId: string
  field: keyof NavPlanRow
  value: number
  tone: 'shared' | 'fall' | 'spring' | 'year'
  onChange: NavPlanTableProps['onChange']
}) {
  return (
    <td className={`col-num col-tone-${tone}`}>
      <input
        type="number"
        min={0}
        inputMode="numeric"
        value={numValue(value)}
        onChange={(e) =>
          onChange(rowId, field, e.target.value === '' ? 0 : Number(e.target.value))
        }
      />
    </td>
  )
}

export function navPlanNeedsReimport(rows: NavPlanRow[]): boolean {
  return rows.some((row) => {
    const fallDetail =
      row.fallLectures +
      row.fallPractical +
      row.fallLab +
      row.fallCoursework +
      row.fallConsult +
      row.fallCredits +
      row.fallExams
    const springDetail =
      row.springLectures +
      row.springPractical +
      row.springLab +
      row.springCoursework +
      row.springConsult +
      row.springSupervised +
      row.springCredits +
      row.springExams +
      row.springDpa +
      row.springDkk

    if (row.hoursTotal > 0 && fallDetail === 0 && springDetail === 0 && row.hoursFall === 0 && row.hoursSpring === 0) {
      return false
    }

    if ((row.hoursFall > 0 || row.hoursSpring > 0) && row.hoursTotal === 0) return true
    if (row.hoursFall > 0 && fallDetail === 0) return true
    if (row.hoursSpring > 0 && springDetail === 0) return true
    return false
  })
}

export function NavPlanTable({
  rows,
  onChange,
  onDelete,
  emptyText = 'Немає рядків',
}: NavPlanTableProps) {
  if (rows.length === 0) {
    return <p className="muted table-empty">{emptyText}</p>
  }

  return (
    <div className="nav-plan-scroll">
      <table className="data-table nav-plan-table">
        <thead>
          <tr className="nav-plan-group-row">
            <th colSpan={3} className="sticky-col sticky-0 nav-plan-corner" />
            <th colSpan={SHARED_COLS.length} className="nav-plan-group shared-group">
              Кількість годин
            </th>
            <th colSpan={FALL_COLS.length} className="nav-plan-group fall-group">
              Осінній семестр
            </th>
            <th colSpan={SPRING_COLS.length} className="nav-plan-group spring-group">
              Весняний семестр
            </th>
            <th colSpan={YEAR_COLS.length} className="nav-plan-group year-group">
              За навч. рік
            </th>
            {onDelete ? <th className="col-delete" rowSpan={2} /> : null}
          </tr>
          <tr>
            <th className="sticky-col sticky-0 col-group">Група</th>
            <th className="sticky-col sticky-1 col-subject">Предмет</th>
            <th className="sticky-col sticky-2 col-teacher">Викладач</th>
            {SHARED_COLS.map((col) => (
              <th key={String(col.key)} className="col-vhead shared-group">
                {col.title}
              </th>
            ))}
            {FALL_COLS.map((col) => (
              <th key={String(col.key)} className="col-vhead fall-group">
                {col.title}
              </th>
            ))}
            {SPRING_COLS.map((col) => (
              <th key={String(col.key)} className="col-vhead spring-group">
                {col.title}
              </th>
            ))}
            {YEAR_COLS.map((col) => (
              <th key={String(col.key)} className="col-vhead year-group">
                {col.title}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              className={row.planKind !== 'schedule' ? 'nav-plan-row-excluded' : undefined}
            >
              <td className="sticky-col sticky-0 col-group">
                <input
                  value={row.groupCode}
                  onChange={(e) => onChange(row.id, 'groupCode', e.target.value)}
                />
              </td>
              <td className="sticky-col sticky-1 col-subject">
                <input
                  title={row.subject}
                  value={row.subject}
                  onChange={(e) => onChange(row.id, 'subject', e.target.value)}
                />
                {row.planKind !== 'schedule' ? (
                  <span className="plan-kind-badge" title={row.planKindLabel}>
                    {row.planKindLabel}
                  </span>
                ) : null}
              </td>
              <td className="sticky-col sticky-2 col-teacher">
                <input
                  value={row.teacher}
                  onChange={(e) => onChange(row.id, 'teacher', e.target.value)}
                />
              </td>
              {SHARED_COLS.map((col) => (
                <NumCell
                  key={String(col.key)}
                  rowId={row.id}
                  field={col.key}
                  value={row[col.key] as number}
                  tone="shared"
                  onChange={onChange}
                />
              ))}
              {FALL_COLS.map((col) => (
                <NumCell
                  key={String(col.key)}
                  rowId={row.id}
                  field={col.key}
                  value={row[col.key] as number}
                  tone="fall"
                  onChange={onChange}
                />
              ))}
              {SPRING_COLS.map((col) => (
                <NumCell
                  key={String(col.key)}
                  rowId={row.id}
                  field={col.key}
                  value={row[col.key] as number}
                  tone="spring"
                  onChange={onChange}
                />
              ))}
              {YEAR_COLS.map((col) => (
                <NumCell
                  key={String(col.key)}
                  rowId={row.id}
                  field={col.key}
                  value={row[col.key] as number}
                  tone="year"
                  onChange={onChange}
                />
              ))}
              {onDelete ? (
                <td className="col-delete">
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => onDelete(row.id)}
                    title="Видалити"
                  >
                    ×
                  </button>
                </td>
              ) : null}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function createEmptyNavPlanRow(groupCode = ''): NavPlanRow {
  return normalizeNavPlanRow({ id: '', groupCode })
}
