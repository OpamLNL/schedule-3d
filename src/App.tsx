import { useCallback, useEffect, useState } from 'react'
import { TopNav, type AppPage } from './components/AppLayout'
import { PlanningProvider } from './context/PlanningContext'
import { ThemeProvider } from './context/ThemeContext'
import { CylinderPage } from './pages/CylinderPage'
import { GroupsPage } from './pages/GroupsPage'
import { NavPlanPage } from './pages/NavPlanPage'
import { PreferencesPage } from './pages/PreferencesPage'
import { RoomRulesPage } from './pages/RoomRulesPage'
import { SchedulePage } from './pages/SchedulePage'
import { readAppPageFromHash, writeAppPageToHash } from './utils/appRouting'
import './App.css'

function AppRouter() {
  const [page, setPage] = useState<AppPage>(() => readAppPageFromHash())

  useEffect(() => {
    const syncFromHash = () => setPage(readAppPageFromHash())
    window.addEventListener('hashchange', syncFromHash)
    return () => window.removeEventListener('hashchange', syncFromHash)
  }, [])

  const onPageChange = useCallback((next: AppPage) => {
    setPage(next)
    writeAppPageToHash(next)
  }, [])

  if (page === 'cylinder') {
    return (
      <>
        <TopNav page={page} onPageChange={onPageChange} />
        <CylinderPage />
      </>
    )
  }

  const common = { page, onPageChange }

  if (page === 'nav') return <NavPlanPage {...common} />
  if (page === 'groups') return <GroupsPage {...common} />
  if (page === 'rooms') return <RoomRulesPage {...common} />
  if (page === 'schedule') return <SchedulePage {...common} />
  return <PreferencesPage {...common} />
}

export default function App() {
  return (
    <ThemeProvider>
      <PlanningProvider>
        <AppRouter />
      </PlanningProvider>
    </ThemeProvider>
  )
}
