import type { AppPage } from '../components/AppLayout'

const APP_PAGES: AppPage[] = [
  'nav',
  'groups',
  'teacherPrefs',
  'subjectPrefs',
  'rooms',
  'schedule',
  'cylinder',
]

const LEGACY_PAGE_ALIASES: Record<string, AppPage> = {
  prefs: 'teacherPrefs',
}

export function isAppPage(value: string): value is AppPage {
  return APP_PAGES.includes(value as AppPage)
}

export function readAppPageFromHash(): AppPage {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]?.trim() ?? ''
  if (isAppPage(raw)) return raw
  const legacy = LEGACY_PAGE_ALIASES[raw]
  if (legacy) return legacy
  return 'nav'
}

export function writeAppPageToHash(page: AppPage) {
  const next = `#/${page}`
  if (window.location.hash !== next) {
    window.location.hash = next
  }
}
