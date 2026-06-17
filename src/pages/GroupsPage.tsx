import { useMemo, useState } from 'react'
import { AppLayout, SaveToolbar, type AppPage } from '../components/AppLayout'
import { DataTable } from '../components/DataTable'
import { TableTextFilters } from '../components/TableTextFilters'
import { usePlanning } from '../context/PlanningContext'
import type { GroupRow } from '../types/planning'
import { newId, normalizeGroupCode } from '../utils/normalize'
import { filterTableRows } from '../utils/tableRowFilters'

type PageProps = { page: AppPage; onPageChange: (page: AppPage) => void }

const emptyGroupFilters = { code: '', room: '', shift: '', query: '' }

export function GroupsPage({ page, onPageChange }: PageProps) {
  const { store, setStore, saveLocal, loadCloud, saveCloud, cloudEnabled, status } = usePlanning()
  const [filters, setFilters] = useState(emptyGroupFilters)

  const filteredRows = useMemo(
    () => filterTableRows(store.groups, filters, ['code', 'room', 'shift']),
    [store.groups, filters],
  )

  const updateRow = (id: string, key: keyof GroupRow, value: string | number) => {
    setStore((current) => ({
      ...current,
      groups: current.groups.map((row) => {
        if (row.id !== id) return row
        if (key === 'code') return { ...row, code: normalizeGroupCode(String(value)) }
        if (key === 'shift') return { ...row, shift: Number(value) === 2 ? 2 : 1 }
        return { ...row, [key]: value }
      }),
    }))
  }

  const deleteRow = (id: string) => {
    setStore((current) => ({
      ...current,
      groups: current.groups.filter((row) => row.id !== id),
    }))
  }

  const addRow = () => {
    setStore((current) => ({
      ...current,
      groups: [
        ...current.groups,
        {
          id: newId('g'),
          code: '',
          weeksFall: 14,
          weeksSpring: 18,
          room: '',
          shift: 1,
        },
      ],
    }))
  }

  return (
    <AppLayout
      page={page}
      onPageChange={onPageChange}
      title="Групи"
      subtitle={`Навчальні тижні, стала аудиторія та зміна. Показано ${filteredRows.length} з ${store.groups.length}.`}
      toolbar={
        <SaveToolbar
          onSaveLocal={saveLocal}
          onLoadCloud={loadCloud}
          onSaveCloud={saveCloud}
          cloudEnabled={cloudEnabled}
          extra={
            <button type="button" className="btn" onClick={addRow}>
              + Група
            </button>
          }
        />
      }
      status={status}
    >
      <TableTextFilters
        fields={[
          { key: 'code', label: 'Група', placeholder: 'КН31…' },
          { key: 'room', label: 'Аудиторія', placeholder: '301…' },
          { key: 'shift', label: 'Зміна', placeholder: '1 або 2' },
        ]}
        values={filters}
        onChange={(key, value) => setFilters((current) => ({ ...current, [key]: value }))}
        onReset={() => setFilters(emptyGroupFilters)}
      />
      <DataTable
        rows={filteredRows}
        onChange={updateRow}
        onDelete={deleteRow}
        columns={[
          { key: 'code', title: 'Група', editable: true, width: '100px' },
          { key: 'weeksFall', title: '1 семестр (тиж.)', editable: true, inputType: 'number', width: '120px' },
          { key: 'weeksSpring', title: '2 семестр (тиж.)', editable: true, inputType: 'number', width: '120px' },
          { key: 'room', title: 'Аудиторія (стала)', editable: true, width: '120px' },
          {
            key: 'shift',
            title: 'Зміна',
            editable: true,
            inputType: 'select',
            width: '90px',
            options: [
              { value: '1', label: '1' },
              { value: '2', label: '2' },
            ],
          },
        ]}
      />
    </AppLayout>
  )
}
