import { useTheme } from '../context/ThemeContext'

export function ThemeToggle() {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      type="button"
      className="theme-toggle"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Увімкнути світлу тему' : 'Увімкнути темну тему'}
      aria-label={theme === 'dark' ? 'Світла тема' : 'Темна тема'}
    >
      {theme === 'dark' ? '☀ Світла' : '🌙 Темна'}
    </button>
  )
}
