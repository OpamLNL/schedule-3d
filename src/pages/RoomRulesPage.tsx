import { useMemo, useState } from 'react'
import { AppLayout, SaveToolbar, type AppPage } from '../components/AppLayout'
import { DataTable } from '../components/DataTable'
import { TableTextFilters } from '../components/TableTextFilters'
import { usePlanning } from '../context/PlanningContext'
import type { RoomRuleRow } from '../types/planning'
import { newId } from '../utils/normalize'
import { filterTableRows } from '../utils/tableRowFilters'

type PageProps = { page: AppPage; onPageChange: (page: AppPage) => void }

const emptyRoomFilters = { subject: '', teacher: '', room: '', query: '' }

export function RoomRulesPage({ page, onPageChange }: PageProps) {
  const { store, setStore, saveLocal, loadCloud, saveCloud, cloudEnabled, status } = usePlanning()
  const [filters, setFilters] = useState(emptyRoomFilters)

  const filteredRows = useMemo(
    () => filterTableRows(store.roomRules, filters, ['subject', 'teacher', 'room']),
    [store.roomRules, filters],
  )

  const updateRow = (id: string, key: keyof RoomRuleRow, value: string | number) => {
    setStore((current) => ({
      ...current,
      roomRules: current.roomRules.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    }))
  }

  const deleteRow = (id: string) => {
    setStore((current) => ({
      ...current,
      roomRules: current.roomRules.filter((row) => row.id !== id),
    }))
  }

  const addRow = () => {
    setStore((current) => ({
      ...current,
      roomRules: [
        ...current.roomRules,
        { id: newId('rr'), subject: '', teacher: '', room: 'своя' },
      ],
    }))
  }

  return (
    <AppLayout
      page={page}
      onPageChange={onPageChange}
      title="Аудиторії"
      subtitle="Закріплення: предмет + викладач → аудиторія. «своя» = кімната групи."
      toolbar={
        <SaveToolbar
          onSaveLocal={saveLocal}
          onLoadCloud={loadCloud}
          onSaveCloud={saveCloud}
          cloudEnabled={cloudEnabled}
          extra={
            <button type="button" className="btn" onClick={addRow}>
              + Правило
            </button>
          }
        />
      }
      status={status}
    >
      <section className="panel section-block">
        <p className="muted filter-count">
          Показано {filteredRows.length} з {store.roomRules.length}
        </p>
        <TableTextFilters
        fields={[
          { key: 'subject', label: 'Предмет', placeholder: 'частина назви', className: 'filter-subject' },
          { key: 'teacher', label: 'Викладач', placeholder: 'прізвище' },
          { key: 'room', label: 'Аудиторія', placeholder: '301, своя…' },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        onReset={() => setFilters(emptyRoomFilters)}
      />
      <DataTable
        tableClassName="room-rules-table"
        rows={filteredRows}
        onChange={updateRow}
        onDelete={deleteRow}
        columns={[
          {
            key: 'subject',
            title: 'Предмет',
            editable: true,
            className: 'col-subject-room',
            width: 'min(360px, 40vw)',
          },
          {
            key: 'teacher',
            title: 'Викладач',
            editable: true,
            className: 'col-teacher-room',
            width: 'min(240px, 28vw)',
          },
          {
            key: 'room',
            title: 'Аудиторія',
            editable: true,
            className: 'col-room-code',
            width: '140px',
          },
        ]}
      />
      </section>
    </AppLayout>
  )
}
