import { AppLayout, SaveToolbar, type AppPage } from '../components/AppLayout'
import { DataTable } from '../components/DataTable'
import { usePlanning } from '../context/PlanningContext'
import type { RoomRuleRow } from '../types/planning'
import { newId } from '../utils/normalize'

type PageProps = { page: AppPage; onPageChange: (page: AppPage) => void }

export function RoomRulesPage({ page, onPageChange }: PageProps) {
  const { store, setStore, saveLocal, loadCloud, saveCloud, cloudEnabled, status } = usePlanning()

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
      title="Закріплення аудиторій"
      subtitle="Предмет + викладач → аудиторія. «своя» = кімната групи з аркуша «Групи»."
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
      <DataTable
        rows={store.roomRules}
        onChange={updateRow}
        onDelete={deleteRow}
        columns={[
          { key: 'subject', title: 'Предмет', editable: true },
          { key: 'teacher', title: 'Викладач', editable: true, width: '180px' },
          { key: 'room', title: 'Аудиторія', editable: true, width: '140px' },
        ]}
      />
    </AppLayout>
  )
}
