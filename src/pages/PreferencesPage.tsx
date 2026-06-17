import { useMemo } from 'react'
import { AppLayout, SaveToolbar, type AppPage } from '../components/AppLayout'
import { DataTable } from '../components/DataTable'
import { SUBJECT_RULE_TEMPLATES, TEACHER_RULE_TEMPLATES } from '../data/defaults'
import { usePlanning } from '../context/PlanningContext'
import type { SubjectPrefRow, TeacherPrefRow } from '../types/planning'
import { newId } from '../utils/normalize'

type PageProps = { page: AppPage; onPageChange: (page: AppPage) => void }

export function PreferencesPage({ page, onPageChange }: PageProps) {
  const { store, setStore, saveLocal, loadCloud, saveCloud, cloudEnabled, status } = usePlanning()

  const teachers = useMemo(() => {
    const fromPlan = store.navPlan.map((r) => r.teacher).filter(Boolean)
    const fromPrefs = store.teacherPrefs.map((r) => r.teacher).filter(Boolean)
    return [...new Set([...fromPlan, ...fromPrefs])].sort((a, b) => a.localeCompare(b, 'uk'))
  }, [store.navPlan, store.teacherPrefs])

  const subjects = useMemo(() => {
    return [...new Set(store.navPlan.map((r) => r.subject).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'uk'),
    )
  }, [store.navPlan])

  const groups = useMemo(() => {
    return [...new Set(store.groups.map((g) => g.code))].sort()
  }, [store.groups])

  const updateTeacherPref = (id: string, key: keyof TeacherPrefRow, value: string | number) => {
    setStore((current) => ({
      ...current,
      teacherPrefs: current.teacherPrefs.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    }))
  }

  const updateSubjectPref = (id: string, key: keyof SubjectPrefRow, value: string | number) => {
    setStore((current) => ({
      ...current,
      subjectPrefs: current.subjectPrefs.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    }))
  }

  return (
    <AppLayout
      page={page}
      onPageChange={onPageChange}
      title="Преференції"
      subtitle="Правила для викладачів і розмазування предметів по тижню."
      toolbar={
        <SaveToolbar
          onSaveLocal={saveLocal}
          onLoadCloud={loadCloud}
          onSaveCloud={saveCloud}
          cloudEnabled={cloudEnabled}
        />
      }
      status={status}
    >
      <section className="panel section-block">
        <div className="section-head">
          <h2>Викладачі</h2>
          <button
            type="button"
            className="btn"
            onClick={() =>
              setStore((c) => ({
                ...c,
                teacherPrefs: [
                  ...c.teacherPrefs,
                  { id: newId('tp'), teacher: teachers[0] ?? '', rule: TEACHER_RULE_TEMPLATES[0].code },
                ],
              }))
            }
          >
            + Правило
          </button>
        </div>
        <div className="template-chips">
          {TEACHER_RULE_TEMPLATES.map((t) => (
            <span key={t.code} className="chip" title={t.hint}>
              {t.code} — {t.label}
            </span>
          ))}
        </div>
        <DataTable
          rows={store.teacherPrefs}
          onChange={updateTeacherPref}
          onDelete={(id) =>
            setStore((c) => ({ ...c, teacherPrefs: c.teacherPrefs.filter((r) => r.id !== id) }))
          }
          emptyText="Додайте правило для викладача"
          columns={[
            {
              key: 'teacher',
              title: 'Викладач',
              editable: true,
              inputType: 'select',
              options: [
                { value: '', label: '—' },
                ...teachers.map((t) => ({ value: t, label: t })),
              ],
            },
            {
              key: 'rule',
              title: 'Правило',
              editable: true,
              inputType: 'select',
              options: TEACHER_RULE_TEMPLATES.map((t) => ({ value: t.code, label: t.label })),
            },
          ]}
        />
      </section>

      <section className="panel section-block">
        <div className="section-head">
          <h2>Предмети / групи</h2>
          <button
            type="button"
            className="btn"
            onClick={() =>
              setStore((c) => ({
                ...c,
                subjectPrefs: [
                  ...c.subjectPrefs,
                  {
                    id: newId('sp'),
                    groupCode: groups[0] ?? '',
                    subject: subjects[0] ?? '',
                    rule: SUBJECT_RULE_TEMPLATES[0].code,
                  },
                ],
              }))
            }
          >
            + Правило
          </button>
        </div>
        <div className="template-chips">
          {SUBJECT_RULE_TEMPLATES.map((t) => (
            <span key={t.code} className="chip" title={t.hint}>
              {t.code} — {t.label}
            </span>
          ))}
        </div>
        <DataTable
          rows={store.subjectPrefs}
          onChange={updateSubjectPref}
          onDelete={(id) =>
            setStore((c) => ({ ...c, subjectPrefs: c.subjectPrefs.filter((r) => r.id !== id) }))
          }
          emptyText="Напр.: не більше 1 пари ООП на день для КН31"
          columns={[
            {
              key: 'groupCode',
              title: 'Група',
              editable: true,
              inputType: 'select',
              options: [
                { value: '', label: 'Усі' },
                ...groups.map((g) => ({ value: g, label: g })),
              ],
            },
            {
              key: 'subject',
              title: 'Предмет',
              editable: true,
              inputType: 'select',
              options: [
                { value: '', label: '—' },
                ...subjects.map((s) => ({ value: s, label: s })),
              ],
            },
            {
              key: 'rule',
              title: 'Правило',
              editable: true,
              inputType: 'select',
              options: SUBJECT_RULE_TEMPLATES.map((t) => ({ value: t.code, label: t.label })),
            },
          ]}
        />
      </section>
    </AppLayout>
  )
}
