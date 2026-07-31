import {
  createContext,
  useContext,
  useEffect,
  useEffectEvent,
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

interface SettingsContextValue {
  settings: AppSettings
  setTheme: (theme: ThemePreference) => void
  setDailyCalorieGoal: (goal: number) => void
  toggleHealthConnection: (id: HealthConnectionId) => void
}

const SettingsContext = createContext<SettingsContextValue | null>(null)

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings())

  const syncTheme = useEffectEvent(() => {
    applyThemeClass(resolveTheme(settings.theme))
  })

  useEffect(() => {
    saveSettings(settings)
    syncTheme()
  }, [settings])

  useEffect(() => {
    if (settings.theme !== 'system') return

    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const onChange = () => applyThemeClass(resolveTheme('system'))
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [settings.theme])

  function setTheme(theme: ThemePreference) {
    setSettings((prev) => ({ ...prev, theme }))
  }

  function setDailyCalorieGoal(dailyCalorieGoal: number) {
    setSettings((prev) => ({ ...prev, dailyCalorieGoal }))
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
      value={{ settings, setTheme, setDailyCalorieGoal, toggleHealthConnection }}
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
