import { useMemo, useState } from 'react'
import { AppLayout, SaveToolbar, type AppPage } from '../components/AppLayout'
import { DataTable } from '../components/DataTable'
import { TableTextFilters } from '../components/TableTextFilters'
import { SUBJECT_RULE_TEMPLATES } from '../data/defaults'
import { usePlanning } from '../context/PlanningContext'
import type { SubjectPrefRow } from '../types/planning'
import { newId } from '../utils/normalize'
import { filterTableRows } from '../utils/tableRowFilters'
import { matchesAnyText } from '../utils/filterTerms'

type PageProps = { page: AppPage; onPageChange: (page: AppPage) => void }

const emptySubjectFilters = { groupCode: '', subject: '', rule: '', query: '' }

export function SubjectPrefsPage({ page, onPageChange }: PageProps) {
  const { store, setStore, saveLocal, loadCloud, saveCloud, cloudEnabled, status } = usePlanning()
  const [subjectFilters, setSubjectFilters] = useState(emptySubjectFilters)

  const subjects = useMemo(() => {
    return [...new Set(store.navPlan.map((r) => r.subject).filter(Boolean))].sort((a, b) =>
      a.localeCompare(b, 'uk'),
    )
  }, [store.navPlan])

  const groups = useMemo(() => {
    return [...new Set(store.groups.map((g) => g.code))].sort((a, b) => a.localeCompare(b, 'uk'))
  }, [store.groups])

  const ruleLabelByCode = useMemo(
    () => new Map<string, string>(SUBJECT_RULE_TEMPLATES.map((t) => [t.code, t.label])),
    [],
  )

  const filteredSubjectPrefs = useMemo(() => {
    const ruleFilter = subjectFilters.rule.trim()
    return filterTableRows(store.subjectPrefs, subjectFilters, ['groupCode', 'subject']).filter((row) => {
      if (!ruleFilter) return true
      const haystack = `${row.rule} ${ruleLabelByCode.get(row.rule) ?? ''}`
      return matchesAnyText(haystack, ruleFilter)
    })
  }, [store.subjectPrefs, subjectFilters, ruleLabelByCode])

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
      title="Преференції предметів"
      subtitle="Обмеження розмазування предметів по тижню для груп."
      toolbar={
        <SaveToolbar
          onSaveLocal={saveLocal}
          onLoadCloud={loadCloud}
          onSaveCloud={saveCloud}
          cloudEnabled={cloudEnabled}
          extra={
            <>
              <button type="button" className="btn" onClick={() => onPageChange('teacherPrefs')}>
                ← Викладачі
              </button>
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
            </>
          }
        />
      }
      status={status}
    >
      <section className="panel section-block">
        <div className="template-chips">
          {SUBJECT_RULE_TEMPLATES.map((t) => (
            <span key={t.code} className="chip" title={t.hint}>
              {t.code} — {t.label}
            </span>
          ))}
        </div>
        {store.navPlan.length === 0 ? (
          <p className="muted teacher-source-hint">
            Список предметів порожній — спочатку{' '}
            <button type="button" className="link-btn" onClick={() => onPageChange('nav')}>
              завантажте навплан
            </button>
            .
          </p>
        ) : (
          <p className="muted teacher-source-hint">
            Доступно {subjects.length} предметів з навплану. У полі «Предмет» почніть вводити назву — з’явиться
            список.
          </p>
        )}
        <TableTextFilters
          fields={[
            {
              key: 'groupCode',
              label: 'Група',
              placeholder: 'КН31',
              suggestions: groups,
              searchMode: 'text',
            },
            {
              key: 'subject',
              label: 'Предмет',
              placeholder: 'назва предмета',
              suggestions: subjects,
              searchMode: 'text',
            },
            { key: 'rule', label: 'Правило', placeholder: 'max_1, Max 2…' },
          ]}
          values={subjectFilters}
          onChange={(key, value) => setSubjectFilters((current) => ({ ...current, [key]: value }))}
          onReset={() => setSubjectFilters(emptySubjectFilters)}
        />
        <p className="muted filter-count">
          Показано {filteredSubjectPrefs.length} з {store.subjectPrefs.length}
        </p>
        <DataTable
          tableClassName="subject-prefs-table"
          rows={filteredSubjectPrefs}
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
              inputType: 'datalist',
              datalistOptions: groups,
              comboboxSearchMode: 'text',
              comboboxPlaceholder: 'КН31 або порожньо = усі',
              comboboxEmptyHint: 'Спочатку додайте групи на сторінці «Навплан»',
              className: 'col-group-pref',
              width: '120px',
            },
            {
              key: 'subject',
              title: 'Предмет',
              editable: true,
              inputType: 'datalist',
              datalistOptions: subjects,
              comboboxSearchMode: 'text',
              comboboxPlaceholder: 'почніть вводити назву',
              comboboxEmptyHint: 'Завантажте навплан — тоді з’явиться список предметів',
              className: 'col-subject-pref',
              width: 'min(360px, 42vw)',
            },
            {
              key: 'rule',
              title: 'Правило',
              editable: true,
              inputType: 'select',
              options: SUBJECT_RULE_TEMPLATES.map((t) => ({ value: t.code, label: t.label })),
              className: 'col-rule-pref',
              width: 'min(280px, 34vw)',
            },
          ]}
        />
      </section>
    </AppLayout>
  )
}
