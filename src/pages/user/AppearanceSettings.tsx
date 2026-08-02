import { useSettings } from '../../hooks/useSettings'
import type { ThemePreference } from '../../types/settings'

const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'light', label: 'Light', hint: 'Always light' },
  { value: 'dark', label: 'Dark', hint: 'Always dark' },
  { value: 'system', label: 'System', hint: 'Match device' },
]

export default function AppearanceSettings() {
  const { settings, setTheme } = useSettings()

  return (
    <div className="space-y-3">
      <p className="text-sm text-stone-500 dark:text-stone-400">
        Choose how the app looks on this device.
      </p>
      <div className="grid grid-cols-3 gap-2 rounded-2xl bg-white p-2 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
        {THEME_OPTIONS.map((option) => {
          const selected = settings.theme === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setTheme(option.value)}
              className={`rounded-xl px-2 py-3 text-center transition-colors ${
                selected
                  ? 'bg-teal-700 text-white'
                  : 'text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800'
              }`}
            >
              <span className="block text-sm font-medium">{option.label}</span>
              <span
                className={`mt-0.5 block text-[10px] leading-tight ${
                  selected ? 'text-teal-100' : 'text-stone-400 dark:text-stone-500'
                }`}
              >
                {option.hint}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
