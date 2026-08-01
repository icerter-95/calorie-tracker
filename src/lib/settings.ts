import { DEFAULT_SETTINGS, type AppSettings } from '../types/settings'

const STORAGE_KEY = 'calorie-tracker-settings'

/** Older settings used a single `dailyCalorieGoal` field. */
type StoredSettings = Partial<AppSettings> & {
  dailyCalorieGoal?: number
}

function migrateSettings(parsed: StoredSettings): AppSettings {
  const legacyGoal = parsed.dailyCalorieGoal
  const calorieGoalLower =
    parsed.calorieGoalLower ??
    (typeof legacyGoal === 'number' ? legacyGoal : DEFAULT_SETTINGS.calorieGoalLower)

  const calorieGoalUpper =
    parsed.calorieGoalUpper ??
    Math.max(calorieGoalLower + 400, Math.round(calorieGoalLower * 1.15))

  return {
    ...DEFAULT_SETTINGS,
    ...parsed,
    calorieGoalLower,
    calorieGoalUpper,
    proteinGoal: parsed.proteinGoal ?? DEFAULT_SETTINGS.proteinGoal,
    carbsGoal: parsed.carbsGoal ?? DEFAULT_SETTINGS.carbsGoal,
    fatGoal: parsed.fatGoal ?? DEFAULT_SETTINGS.fatGoal,
    healthConnections: {
      ...DEFAULT_SETTINGS.healthConnections,
      ...parsed.healthConnections,
    },
  }
}

export function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return structuredClone(DEFAULT_SETTINGS)

    const parsed = JSON.parse(raw) as StoredSettings
    return migrateSettings(parsed)
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
