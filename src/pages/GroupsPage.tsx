import { AppLayout, SaveToolbar, type AppPage } from '../components/AppLayout'
import { DataTable } from '../components/DataTable'
import { usePlanning } from '../context/PlanningContext'
import type { GroupRow } from '../types/planning'
import { newId, normalizeGroupCode } from '../utils/normalize'

type PageProps = { page: AppPage; onPageChange: (page: AppPage) => void }

export function GroupsPage({ page, onPageChange }: PageProps) {
  const { store, setStore, saveLocal, loadCloud, saveCloud, cloudEnabled, status } = usePlanning()

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
      subtitle="Навчальні тижні, стала аудиторія та зміна (1 — пари 1–4, 2 — пари 5–8)."
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
      <DataTable
        rows={store.groups}
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
