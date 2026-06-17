import type { ReactNode } from 'react'

type Column<T> = {
  key: keyof T | string
  title: string
  width?: string
  className?: string
  render?: (row: T, index: number) => ReactNode
  editable?: boolean
  inputType?: 'text' | 'number' | 'select'
  options?: { value: string; label: string }[]
}

type DataTableProps<T extends { id: string }> = {
  rows: T[]
  columns: Column<T>[]
  onChange: (id: string, key: keyof T, value: string | number) => void
  onDelete?: (id: string) => void
  emptyText?: string
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  onChange,
  onDelete,
  emptyText = 'Немає рядків',
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="muted table-empty">{emptyText}</p>
  }

  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={col.className}
                style={col.width ? { width: col.width } : undefined}
              >
                {col.title}
              </th>
            ))}
            {onDelete ? <th style={{ width: 48 }} /> : null}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.id}>
              {columns.map((col) => {
                const key = col.key as keyof T
                if (col.render) {
                  return (
                    <td key={String(col.key)} className={col.className}>
                      {col.render(row, index)}
                    </td>
                  )
                }
                const value = row[key]
                if (!col.editable) {
                  return (
                    <td key={String(col.key)} className={col.className}>
                      {String(value ?? '')}
                    </td>
                  )
                }
                if (col.inputType === 'select' && col.options) {
                  return (
                    <td key={String(col.key)} className={col.className}>
                      <select
                        value={String(value ?? '')}
                        onChange={(e) => onChange(row.id, key, e.target.value)}
                      >
                        {col.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  )
                }
                return (
                  <td key={String(col.key)} className={col.className}>
                    <input
                      type={col.inputType === 'number' ? 'number' : 'text'}
                      value={value === undefined || value === null ? '' : String(value)}
                      onChange={(e) =>
                        onChange(
                          row.id,
                          key,
                          col.inputType === 'number' ? Number(e.target.value) : e.target.value,
                        )
                      }
                    />
                  </td>
                )
              })}
              {onDelete ? (
                <td>
                  <button type="button" className="btn-icon" onClick={() => onDelete(row.id)} title="Видалити">
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
