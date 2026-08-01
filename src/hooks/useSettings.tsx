import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import {
  applyThemeClass,
  loadSettings,
  resolveTheme,
  saveSettings,
} from '../lib/settings'
import type {
  AppSettings,
  HealthConnectionId,
  ThemePreference,
} from '../types/settings'

interface GoalUpdates {
  calorieGoalLower?: number
  calorieGoalUpper?: number
  proteinGoal?: number
  carbsGoal?: number
  fatGoal?: number
}

interface SettingsContextValue {
  settings: AppSettings
  setTheme: (theme: ThemePreference) => void
  updateGoals: (goals: GoalUpdates) => void
  toggleHealthConnection: (id: HealthConnectionId) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

function readInitialSettings(): AppSettings {
  const initial = loadSettings()
  // Sync before first paint of React tree.
  applyThemeClass(resolveTheme(initial.theme))
  return initial
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(readInitialSettings)

  useEffect(() => {
    saveSettings(settings)
    applyThemeClass(resolveTheme(settings.theme))
  }, [settings])

  useEffect(() => {
    if (settings.theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeClass(resolveTheme('system'))
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [settings.theme])

  function setTheme(theme: ThemePreference) {
    applyThemeClass(resolveTheme(theme))
    setSettings((prev) => ({ ...prev, theme }))
  }

  function updateGoals(goals: GoalUpdates) {
    setSettings((prev) => ({ ...prev, ...goals }))
  }

  function toggleHealthConnection(id: HealthConnectionId) {
    setSettings((prev) => {
      const current = prev.healthConnections[id]
      const connected = !current.connected
      return {
        ...prev,
        healthConnections: {
          ...prev.healthConnections,
          [id]: {
            ...current,
            connected,
            lastSyncAt: connected ? Date.now() : undefined,
          },
        },
      }
    })
  }

  return (
    <SettingsContext.Provider
      value={{ settings, setTheme, updateGoals, toggleHealthConnection }}
    >
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  const ctx = useContext(SettingsContext)
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider')
  return ctx
}
