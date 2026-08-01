import { DEFAULT_SETTINGS, type AppSettings } from '../types/settings'

const STORAGE_KEY = 'calorie-tracker-settings'

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_SETTINGS)

    const parsed = JSON.parse(raw) as Partial<AppSettings>
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
      healthConnections: {
        ...DEFAULT_SETTINGS.healthConnections,
        ...parsed.healthConnections,
      },
    }
  } catch {
    return structuredClone(DEFAULT_SETTINGS)
  }
}

export function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

export function resolveTheme(preference: AppSettings['theme']): 'light' | 'dark' {
  if (preference === 'light' || preference === 'dark') return preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** Apply resolved theme to <html>. Light must win over the phone OS dark mode. */
export function applyThemeClass(resolved: 'light' | 'dark') {
  const root = document.documentElement

  root.dataset.theme = resolved
  root.classList.toggle('dark', resolved === 'dark')
  root.style.colorScheme = resolved

  let meta = document.querySelector('meta[name="color-scheme"]')
  if (!meta) {
    meta = document.createElement('meta')
    meta.setAttribute('name', 'color-scheme')
    document.head.appendChild(meta)
  }
  // "only light" / "only dark" stops Safari from auto-forcing OS appearance.
  meta.setAttribute('content', resolved === 'dark' ? 'only dark' : 'only light')
}
