import type { ReactNode } from 'react'
import { ThemeToggle } from './ThemeToggle'

export type AppPage = 'nav' | 'groups' | 'rooms' | 'prefs' | 'schedule' | 'cylinder'

const PAGES: { id: AppPage; label: string }[] = [
  { id: 'nav', label: 'Навплан' },
  { id: 'groups', label: 'Групи' },
  { id: 'rooms', label: 'Аудиторії' },
  { id: 'prefs', label: 'Преференції' },
  { id: 'schedule', label: 'Розклад' },
  { id: 'cylinder', label: '3D циліндр' },
]

type AppLayoutProps = {
  page: AppPage
  onPageChange: (page: AppPage) => void
  title: string
  subtitle?: string
  toolbar?: ReactNode
  status?: string | null
  children: ReactNode
}

export function AppLayout({ page, onPageChange, title, subtitle, toolbar, status, children }: AppLayoutProps) {
  return (
    <div className="app-shell admin-shell">
      <header className="app-header admin-header">
        <div>
          <p className="eyebrow">Планування навчального процесу</p>
          <h1>{title}</h1>
          {subtitle ? <p className="subtitle">{subtitle}</p> : null}
        </div>
        <div className="header-actions">
          {status ? <div className="status-pill">{status}</div> : null}
          <ThemeToggle />
        </div>
      </header>

      <nav className="page-nav">
        {PAGES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={page === item.id ? 'nav-btn active' : 'nav-btn'}
            onClick={() => onPageChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>

      {toolbar ? <div className="page-toolbar">{toolbar}</div> : null}
      <main className="page-content">{children}</main>
    </div>
  )
}

export function SaveToolbar({
  onSaveLocal,
  onLoadCloud,
  onSaveCloud,
  cloudEnabled,
  extra,
}: {
  onSaveLocal: () => void
  onLoadCloud?: () => void
  onSaveCloud?: () => void
  cloudEnabled: boolean
  extra?: ReactNode
}) {
  return (
    <div className="toolbar-actions">
      {extra}
      <button type="button" className="btn primary" onClick={onSaveLocal}>
        Зберегти
      </button>
      {cloudEnabled ? (
        <>
          <button type="button" className="btn" onClick={onLoadCloud}>
            З хмари
          </button>
          <button type="button" className="btn" onClick={onSaveCloud}>
            В хмару
          </button>
        </>
      ) : (
        <span className="muted toolbar-note">Хмара: VITE_SHEETS_API_URL</span>
      )}
    </div>
  )
}

export function TopNav({ page, onPageChange }: { page: AppPage; onPageChange: (page: AppPage) => void }) {
  return (
    <div className="top-bar">
      <nav className="page-nav cylinder-nav">
        {PAGES.map((item) => (
          <button
            key={item.id}
            type="button"
            className={page === item.id ? 'nav-btn active' : 'nav-btn'}
            onClick={() => onPageChange(item.id)}
          >
            {item.label}
          </button>
        ))}
      </nav>
      <ThemeToggle />
    </div>
  )
}
