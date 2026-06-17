import type { ReactNode } from 'react'
import { TeacherCombobox } from './TeacherCombobox'

type Column<T> = {
  key: keyof T | string
  title: string
  width?: string
  className?: string
  render?: (row: T, index: number) => ReactNode
  editable?: boolean
  inputType?: 'text' | 'number' | 'select' | 'datalist'
  options?: { value: string; label: string }[]
  datalistOptions?: string[]
  comboboxPlaceholder?: string
  comboboxEmptyHint?: string
  comboboxSearchMode?: 'teacher' | 'text'
}

type DataTableProps<T extends { id: string }> = {
  rows: T[]
  columns: Column<T>[]
  onChange: (id: string, key: keyof T, value: string | number) => void
  onDelete?: (id: string) => void
  emptyText?: string
  tableClassName?: string
}

export function DataTable<T extends { id: string }>({
  rows,
  columns,
  onChange,
  onDelete,
  emptyText = 'Немає рядків',
  tableClassName,
}: DataTableProps<T>) {
  if (rows.length === 0) {
    return <p className="muted table-empty">{emptyText}</p>
  }

  return (
    <div className="table-wrap">
      <table className={tableClassName ? `data-table ${tableClassName}` : 'data-table'}>
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={String(col.key)}
                className={col.className}
                style={col.width ? { width: col.width, maxWidth: col.width } : undefined}
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
                const cellStyle = col.width ? { width: col.width, maxWidth: col.width } : undefined
                if (col.render) {
                  return (
                    <td key={String(col.key)} className={col.className} style={cellStyle}>
                      {col.render(row, index)}
                    </td>
                  )
                }
                const value = row[key]
                if (!col.editable) {
                  return (
                    <td key={String(col.key)} className={col.className} style={cellStyle}>
                      {String(value ?? '')}
                    </td>
                  )
                }
                if (col.inputType === 'select' && col.options) {
                  return (
                    <td key={String(col.key)} className={col.className} style={cellStyle}>
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
                if (col.inputType === 'datalist' && col.datalistOptions) {
                  return (
                    <td key={String(col.key)} className={col.className} style={cellStyle}>
                      <TeacherCombobox
                        value={value === undefined || value === null ? '' : String(value)}
                        options={col.datalistOptions}
                        placeholder={col.comboboxPlaceholder}
                        emptyHint={col.comboboxEmptyHint}
                        searchMode={col.comboboxSearchMode}
                        onChange={(next) => onChange(row.id, key, next)}
                      />
                    </td>
                  )
                }
                return (
                  <td key={String(col.key)} className={col.className} style={cellStyle}>
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
