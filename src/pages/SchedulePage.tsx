import { useMemo, useState } from 'react'
import { AppLayout, SaveToolbar, type AppPage } from '../components/AppLayout'
import { BatchExportPanel } from '../components/BatchExportPanel'
import { DocumentVersionsPanel } from '../components/DocumentVersionsPanel'
import { ScheduleBuildProgress } from '../components/ScheduleBuildProgress'
import { exportScheduleDocumentJson, usePlanning } from '../context/PlanningContext'
import type { ScheduleDocument } from '../types/documents'
import { enrichEntries } from '../utils/conflicts'

type PageProps = { page: AppPage; onPageChange: (page: AppPage) => void }

export function SchedulePage({ page, onPageChange }: PageProps) {
  const {
    store,
    schedule,
    scheduleEdited,
    scheduleBuild,
    generateSpringSchedule,
    saveCurrentSchedule,
    loadScheduleVersion,
    listScheduleVersions,
    deleteScheduleVersion,
    importScheduleJson,
    exportCurrentScheduleJson,
    status,
    setStatus,
  } = usePlanning()
  const [scheduleDocs, setScheduleDocs] = useState<ScheduleDocument[]>([])

  const preview = useMemo(() => {
    if (!schedule) return null
    const enriched = enrichEntries(schedule.entries)
    const conflicts = enriched.filter((e) => e.conflict !== 'none').length
    return { conflicts, groups: schedule.groups.length, entries: schedule.entries.length }
  }, [schedule])

  const refreshScheduleDocs = async () => {
    setScheduleDocs(await listScheduleVersions())
  }

  const handleGenerate = () => {
    void generateSpringSchedule()
  }

  const toolbar = (
    <SaveToolbar
      onSaveLocal={() => void saveCurrentSchedule().then(refreshScheduleDocs)}
      extra={
        <>
          <button
            type="button"
            className="btn primary"
            onClick={handleGenerate}
            disabled={scheduleBuild.running || store.navPlan.length === 0}
          >
            {scheduleBuild.running ? 'Збираємо…' : 'Зібрати весняний розклад'}
          </button>
          <button
            type="button"
            className="btn"
            onClick={() => onPageChange('cylinder')}
            disabled={!schedule || scheduleBuild.running}
          >
            Відкрити 3D
          </button>
          <button
            type="button"
            className="btn"
            disabled={!schedule}
            onClick={() => void saveCurrentSchedule().then(refreshScheduleDocs)}
          >
            Зберегти версію
          </button>
        </>
      }
    />
  )

  return (
    <AppLayout
      page={page}
      onPageChange={onPageChange}
      title="Розклад (весна)"
      subtitle="Автозбірка з навплану, груп, аудиторій і преференцій. 2–3 курс — зміна 2; непарні підгрупи — дистанційно."
      toolbar={toolbar}
      status={status}
    >
      <ScheduleBuildProgress build={scheduleBuild} />

      <section className="panel section-block schedule-rules">
        <h2>Правила збірки</h2>
        <ul className="rules-list">
          <li>Лише <strong>весняний семестр</strong> — лекції + практичні + лабораторні; <strong>1 пара = 2 год</strong>.</li>
          <li>
            <strong>Не в розклад:</strong> навчальні/виробничі практики, курсові, керівництво,
            КП, КР, ДП, ДПА, ДКК.
          </li>
          <li>
            <strong>Усі групи</strong> з навплану (D6, АТ, СП, ПР, КН…); умовні аудиторії{' '}
            <code>~КН21.304</code> для нових груп.
          </li>
          <li>
            <strong>2–3 курс</strong> — зміна 2 (пари 5–8); непарна підгрупа — дистанційно.
          </li>
          <li>Не більше 2 пар одного предмета на день; фізкультура — 1-ша або остання пара.</li>
          <li>
            <strong>Викладач:</strong> за замовчуванням <strong>3–4 пари на день</strong> (не більше 4);
            інше — через преференції викладача.
          </li>
          <li>
            <strong>Підгрупи однієї групи</strong> (напр. іноземна 13 студ. / 9 студ., різні
            викладачі) — одна пара в <strong>один слот</strong>, різні аудиторії.
          </li>
        </ul>
      </section>

      {!schedule && !scheduleBuild.running ? (
        <p className="muted table-empty">
          Розклад ще не зібрано. Завантажте навплан і натисніть «Зібрати весняний розклад».
        </p>
      ) : null}

      {schedule && !scheduleBuild.running ? (
        <section className="panel section-block">
          <h2>Результат</h2>
          <p>
            Груп: <strong>{preview?.groups}</strong> · Пар на тиждень:{' '}
            <strong>{preview?.entries}</strong> · Конфліктів:{' '}
            <strong className={preview?.conflicts ? 'warn-text' : ''}>{preview?.conflicts ?? 0}</strong>
            {scheduleEdited ? (
              <>
                {' '}
                · <span className="warn-text">є незбережені правки</span>
              </>
            ) : null}
          </p>
          <p className="muted">
            Джерело: {schedule.meta.sourceFile} ·{' '}
            {new Date(schedule.meta.generatedAt).toLocaleString('uk-UA')}
          </p>
        </section>
      ) : null}

      {schedule && !scheduleBuild.running ? (
        <BatchExportPanel schedule={schedule} onStatus={setStatus} />
      ) : null}

      <DocumentVersionsPanel
        kind="schedule"
        items={scheduleDocs}
        onRefresh={refreshScheduleDocs}
        onSave={async (label, note) => {
          await saveCurrentSchedule(label, note)
        }}
        onLoad={loadScheduleVersion}
        onDelete={deleteScheduleVersion}
        onExport={exportScheduleDocumentJson}
        onImport={async (file) => {
          try {
            await importScheduleJson(file)
          } catch (err) {
            setStatus(err instanceof Error ? err.message : 'Помилка імпорту')
          }
        }}
        onExportCurrent={exportCurrentScheduleJson}
        canExportCurrent={Boolean(schedule)}
      />

      {store.navPlan.length === 0 ? (
        <p className="warn-banner">Спочатку завантажте навчальний план на вкладці «Навплан».</p>
      ) : null}
    </AppLayout>
  )
}
