import { useMemo, useState } from 'react'
import { AppLayout, SaveToolbar, type AppPage } from '../components/AppLayout'
import { DataTable } from '../components/DataTable'
import { TableTextFilters } from '../components/TableTextFilters'
import { TEACHER_RULE_TEMPLATES } from '../data/defaults'
import { usePlanning } from '../context/PlanningContext'
import type { TeacherPrefRow } from '../types/planning'
import { newId } from '../utils/normalize'
import { filterTableRows } from '../utils/tableRowFilters'
import { matchesAnyText } from '../utils/filterTerms'
import { collectTeacherOptions, countNavPlanRowsWithTeacher, countNavPlanTeachers } from '../utils/teacherOptions'

type PageProps = { page: AppPage; onPageChange: (page: AppPage) => void }

const emptyTeacherFilters = { teacher: '', rule: '', query: '' }

export function TeacherPrefsPage({ page, onPageChange }: PageProps) {
  const { store, schedule, setStore, saveLocal, loadCloud, saveCloud, cloudEnabled, status } = usePlanning()
  const [teacherFilters, setTeacherFilters] = useState(emptyTeacherFilters)

  const ruleLabelByCode = useMemo(
    () => new Map<string, string>(TEACHER_RULE_TEMPLATES.map((t) => [t.code, t.label])),
    [],
  )

  const filteredTeacherPrefs = useMemo(() => {
    const ruleFilter = teacherFilters.rule.trim()
    return filterTableRows(store.teacherPrefs, teacherFilters, ['teacher']).filter((row) => {
      if (!ruleFilter) return true
      const haystack = `${row.rule} ${ruleLabelByCode.get(row.rule) ?? ''}`
      return matchesAnyText(haystack, ruleFilter)
    })
  }, [store.teacherPrefs, teacherFilters, ruleLabelByCode])

  const teachers = useMemo(
    () => collectTeacherOptions(store, schedule),
    [store, schedule],
  )

  const navPlanTeacherCount = useMemo(() => countNavPlanTeachers(store), [store.navPlan])

  const navPlanRowsWithTeacher = useMemo(() => countNavPlanRowsWithTeacher(store), [store.navPlan])

  const updateTeacherPref = (id: string, key: keyof TeacherPrefRow, value: string | number) => {
    setStore((current) => ({
      ...current,
      teacherPrefs: current.teacherPrefs.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    }))
  }

  return (
    <AppLayout
      page={page}
      onPageChange={onPageChange}
      title="Преференції викладачів"
      subtitle="Обмеження навантаження та розкладу для окремих викладачів."
      toolbar={
        <SaveToolbar
          onSaveLocal={saveLocal}
          onLoadCloud={loadCloud}
          onSaveCloud={saveCloud}
          cloudEnabled={cloudEnabled}
          extra={
            <>
              <button type="button" className="btn" onClick={() => onPageChange('subjectPrefs')}>
                Предмети / групи
              </button>
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
            </>
          }
        />
      }
      status={status}
    >
      <section className="panel section-block">
        <div className="template-chips">
          {TEACHER_RULE_TEMPLATES.map((t) => (
            <span key={t.code} className="chip" title={t.hint}>
              {t.code} — {t.label}
            </span>
          ))}
        </div>
        {store.navPlan.length === 0 ? (
          <p className="muted teacher-source-hint">
            Список порожній — спочатку{' '}
            <button type="button" className="link-btn" onClick={() => onPageChange('nav')}>
              завантажте навплан
            </button>
            .
          </p>
        ) : navPlanTeacherCount === 0 ? (
          <p className="muted teacher-source-hint">
            У навплані {store.navPlan.length} рядків
            {navPlanRowsWithTeacher > 0
              ? ` (${navPlanRowsWithTeacher} з заповненим викладачем), але імена не розпізнано — перевірте формат у Excel.`
              : ' — колонка «Викладач» порожня.'}
          </p>
        ) : (
          <p className="muted teacher-source-hint">
            Доступно {teachers.length} викладачів ({navPlanTeacherCount} з навплану). Клікніть у поле — з’явиться
            список.
          </p>
        )}
        <TableTextFilters
          fields={[
            {
              key: 'teacher',
              label: 'Викладач',
              placeholder: 'прізвище',
              suggestions: teachers,
            },
            { key: 'rule', label: 'Правило', placeholder: 'не_1, Max 2…' },
          ]}
          values={teacherFilters}
          onChange={(key, value) => setTeacherFilters((current) => ({ ...current, [key]: value }))}
          onReset={() => setTeacherFilters(emptyTeacherFilters)}
        />
        <p className="muted filter-count">
          Показано {filteredTeacherPrefs.length} з {store.teacherPrefs.length}
        </p>
        <DataTable
          tableClassName="teacher-prefs-table"
          rows={filteredTeacherPrefs}
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
              inputType: 'datalist',
              datalistOptions: teachers,
              className: 'col-teacher-pref',
              width: 'min(320px, 38vw)',
            },
            {
              key: 'rule',
              title: 'Правило',
              editable: true,
              inputType: 'select',
              options: TEACHER_RULE_TEMPLATES.map((t) => ({ value: t.code, label: t.label })),
              className: 'col-rule-pref',
              width: 'min(280px, 34vw)',
            },
          ]}
        />
      </section>
    </AppLayout>
  )
}
