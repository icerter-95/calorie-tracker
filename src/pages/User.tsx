import { useState } from 'react'
import { db } from '../db'
import { seedSampleData } from '../db/seed'
import { useSettings } from '../hooks/useSettings'
import { PLACEHOLDER_USER, type ThemePreference } from '../types/settings'

const THEME_OPTIONS: { value: ThemePreference; label: string; hint: string }[] = [
  { value: 'light', label: 'Light', hint: 'Always light' },
  { value: 'dark', label: 'Dark', hint: 'Always dark' },
  { value: 'system', label: 'System', hint: 'Match device' },
]

const HEALTH_SOURCES = [
  {
    id: 'apple-health' as const,
    name: 'Apple Health',
    description: 'Sync weight and activity from HealthKit',
  },
  {
    id: 'google-fit' as const,
    name: 'Health Connect',
    description: 'Sync weight and steps from Android',
  },
]

function formatSyncTime(ts?: number) {
  if (!ts) return null
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function UserPage() {
  const { settings, setTheme, setDailyCalorieGoal, toggleHealthConnection } = useSettings()
  const [goalDraft, setGoalDraft] = useState(String(settings.dailyCalorieGoal))
  const [goalSaved, setGoalSaved] = useState(false)

  function handleGoalBlur() {
    const parsed = Math.round(Number(goalDraft))
    if (!parsed || parsed < 800 || parsed > 6000) {
      setGoalDraft(String(settings.dailyCalorieGoal))
      return
    }
    setDailyCalorieGoal(parsed)
    setGoalDraft(String(parsed))
    setGoalSaved(true)
    window.setTimeout(() => setGoalSaved(false), 1500)
  }

  async function loadSampleData() {
    if (!window.confirm('Replace all data with sample meals and weight entries?')) return
    await seedSampleData()
    window.location.reload()
  }

  async function clearLocalData() {
    if (
      !window.confirm(
        'Delete all meals and weight entries stored in this browser? This cannot be undone.',
      )
    ) {
      return
    }
    await db.meals.clear()
    await db.weights.clear()
    window.location.reload()
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-teal-700 text-lg font-semibold text-white"
            aria-hidden
          >
            {PLACEHOLDER_USER.initials}
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-lg font-semibold text-stone-900 dark:text-stone-50">
              {PLACEHOLDER_USER.displayName}
            </h2>
            <p className="truncate text-sm text-stone-500 dark:text-stone-400">
              {PLACEHOLDER_USER.email}
            </p>
            <p className="mt-1 text-xs font-medium text-teal-700 dark:text-teal-400">
              Signed in · local account
            </p>
          </div>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Appearance
        </h2>
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
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Goals
        </h2>
        <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
          <label className="block text-sm">
            <span className="mb-1 flex items-center justify-between text-stone-600 dark:text-stone-300">
              Daily calorie target
              {goalSaved && (
                <span className="text-xs font-medium text-teal-700 dark:text-teal-400">Saved</span>
              )}
            </span>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={800}
                max={6000}
                step={50}
                value={goalDraft}
                onChange={(e) => setGoalDraft(e.target.value)}
                onBlur={handleGoalBlur}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') (e.target as HTMLInputElement).blur()
                }}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
              />
              <span className="shrink-0 text-sm text-stone-500 dark:text-stone-400">kcal</span>
            </div>
          </label>
          <p className="mt-2 text-xs text-stone-500 dark:text-stone-400">
            Used as your daily target on Today. Units stay metric (kg, kcal).
          </p>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Connections
        </h2>
        <p className="text-sm text-stone-500 dark:text-stone-400">
          Pull weight and activity from a health app. Sync is simulated for now.
        </p>
        <ul className="space-y-2">
          {HEALTH_SOURCES.map((source) => {
            const connection = settings.healthConnections[source.id]
            const syncLabel = formatSyncTime(connection.lastSyncAt)
            return (
              <li
                key={source.id}
                className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700"
              >
                <div className="min-w-0">
                  <p className="font-medium text-stone-900 dark:text-stone-50">{source.name}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">{source.description}</p>
                  {connection.connected && syncLabel && (
                    <p className="mt-1 text-xs text-teal-700 dark:text-teal-400">
                      Last sync · {syncLabel}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => toggleHealthConnection(source.id)}
                  className={`shrink-0 rounded-xl px-3 py-2 text-sm font-medium transition-colors ${
                    connection.connected
                      ? 'bg-stone-100 text-stone-700 hover:bg-stone-200 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700'
                      : 'bg-teal-700 text-white hover:bg-teal-800'
                  }`}
                >
                  {connection.connected ? 'Disconnect' : 'Connect'}
                </button>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Data
        </h2>
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
          <button
            type="button"
            onClick={loadSampleData}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-stone-800 hover:bg-stone-50 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            Load sample data
            <span className="text-stone-400">→</span>
          </button>
          <div className="border-t border-stone-100 dark:border-stone-800" />
          <button
            type="button"
            onClick={clearLocalData}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Clear all local data
            <span className="text-red-300 dark:text-red-700">→</span>
          </button>
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Account
        </h2>
        <button
          type="button"
          disabled
          title="Auth coming soon"
          className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-stone-400 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-500 dark:ring-stone-700"
        >
          Sign out
        </button>
        <p className="text-center text-xs text-stone-400 dark:text-stone-500">
          Calorie Tracker · v0.1.0 · data stays on this device
        </p>
      </section>
    </div>
  )
}
