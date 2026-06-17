import type { AppPage } from '../components/AppLayout'

const APP_PAGES: AppPage[] = ['nav', 'groups', 'rooms', 'prefs', 'schedule', 'cylinder']

export function isAppPage(value: string): value is AppPage {
  return APP_PAGES.includes(value as AppPage)
}

export function readAppPageFromHash(): AppPage {
  const raw = window.location.hash.replace(/^#\/?/, '').split('?')[0]?.trim() ?? ''
  return isAppPage(raw) ? raw : 'nav'
}

export function writeAppPageToHash(page: AppPage) {
  const next = `#/${page}`
  if (window.location.hash !== next) {
    window.location.hash = next
  }
}
