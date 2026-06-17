import type { ScheduleBuildState } from '../context/PlanningContext'

export function ScheduleBuildProgress({ build }: { build: ScheduleBuildState }) {
  if (!build.running && !build.lastResult && !build.error) return null

  return (
    <section
      className={`panel section-block schedule-build-panel${build.running ? ' is-running' : ''}${build.error ? ' has-error' : ''}`}
      aria-live="polite"
    >
      <div className="schedule-build-head">
        <h2>{build.running ? 'Збираємо розклад…' : build.error ? 'Помилка' : 'Збірку завершено'}</h2>
        <span className="schedule-build-percent">{build.progress}%</span>
      </div>

      <div className="progress-track" role="progressbar" aria-valuenow={build.progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="progress-fill" style={{ width: `${build.progress}%` }} />
      </div>

      <p className="schedule-build-stage">
        <strong>{build.stage}</strong>
        {build.detail ? <span className="muted"> · {build.detail}</span> : null}
      </p>

      {build.error ? <p className="error-banner">{build.error}</p> : null}

      {build.lastResult && !build.running ? (
        <ul className="rules-list schedule-build-warnings">
          {build.lastResult.warnings.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      ) : null}
    </section>
  )
}
