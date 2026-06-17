import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'

export type ThemeId = 'dark' | 'light'

const STORAGE_KEY = 'schedule3d-theme'

type ThemeContextValue = {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  toggleTheme: () => void
  sceneBackground: string
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

function readStoredTheme(): ThemeId {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'light' ? 'light' : 'dark'
  } catch {
    return 'dark'
  }
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>(() => {
    const stored = readStoredTheme()
    document.documentElement.dataset.theme = stored
    return stored
  })

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    try {
      localStorage.setItem(STORAGE_KEY, theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  const setTheme = (next: ThemeId) => setThemeState(next)
  const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'))

  const value = useMemo(
    () => ({
      theme,
      setTheme,
      toggleTheme,
      sceneBackground: theme === 'light' ? '#dce8d4' : '#0f1724',
    }),
    [theme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme поза ThemeProvider')
  return ctx
}
