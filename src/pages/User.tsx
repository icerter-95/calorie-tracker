import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../auth/AuthProvider'
import { clearAllUserData } from '../db'
import { seedSampleData } from '../db/seed'
import { useSettings } from '../hooks/useSettings'
import {
  backfillMealIngredients,
  type BackfillProgress,
} from '../lib/backfillIngredients'
import { getDisplayName, getInitials } from '../lib/userProfile'
import type { ThemePreference } from '../types/settings'

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
  const {
    user,
    updateDisplayName,
    signOut,
    signOutAll,
    savedAccounts,
    switchAccount,
    startAddAccount,
    removeSavedAccountFromDevice,
  } = useAuth()
  const { settings, setTheme, updateGoals, toggleHealthConnection } = useSettings()
  const [calorieLowerDraft, setCalorieLowerDraft] = useState(String(settings.calorieGoalLower))
  const [calorieUpperDraft, setCalorieUpperDraft] = useState(String(settings.calorieGoalUpper))
  const [proteinDraft, setProteinDraft] = useState(String(settings.proteinGoal))
  const [carbsDraft, setCarbsDraft] = useState(String(settings.carbsGoal))
  const [fatDraft, setFatDraft] = useState(String(settings.fatGoal))
  const [goalSaved, setGoalSaved] = useState(false)
  const [goalError, setGoalError] = useState<string | null>(null)
  const [editingGoals, setEditingGoals] = useState(false)
  const [nameDraft, setNameDraft] = useState(getDisplayName(user))
  const [nameSaved, setNameSaved] = useState(false)
  const [nameError, setNameError] = useState<string | null>(null)
  const [editingName, setEditingName] = useState(false)
  const [accountMenuOpen, setAccountMenuOpen] = useState(false)
  const [dataBusy, setDataBusy] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [backfillBusy, setBackfillBusy] = useState(false)
  const [backfillProgress, setBackfillProgress] = useState<BackfillProgress | null>(null)
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null)
  const [accountBusy, setAccountBusy] = useState(false)
  const [accountError, setAccountError] = useState<string | null>(null)
  const accountMenuRef = useRef<HTMLDivElement>(null)

  const otherAccounts = savedAccounts.filter((a) => a.userId !== user?.id)

  useEffect(() => {
    setNameDraft(getDisplayName(user))
    setEditingName(false)
    setAccountMenuOpen(false)
  }, [user])

  useEffect(() => {
    if (!accountMenuOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (!accountMenuRef.current?.contains(event.target as Node)) {
        setAccountMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [accountMenuOpen])

  const displayName = getDisplayName(user)
  const initials = getInitials(displayName)

  function resetGoalDrafts() {
    setCalorieLowerDraft(String(settings.calorieGoalLower))
    setCalorieUpperDraft(String(settings.calorieGoalUpper))
    setProteinDraft(String(settings.proteinGoal))
    setCarbsDraft(String(settings.carbsGoal))
    setFatDraft(String(settings.fatGoal))
    setGoalError(null)
  }

  function startEditGoals() {
    resetGoalDrafts()
    setEditingGoals(true)
  }

  function cancelEditGoals() {
    resetGoalDrafts()
    setEditingGoals(false)
  }

  function handleGoalsSave() {
    const lower = Math.round(Number(calorieLowerDraft))
    const upper = Math.round(Number(calorieUpperDraft))
    const protein = Math.round(Number(proteinDraft))
    const carbs = Math.round(Number(carbsDraft))
    const fat = Math.round(Number(fatDraft))

    if (!lower || lower < 800 || lower > 6000 || !upper || upper < 800 || upper > 6000) {
      setGoalError('Calories must be between 800 and 6000 kcal')
      return
    }
    if (
      !protein ||
      protein < 1 ||
      protein > 1000 ||
      !carbs ||
      carbs < 1 ||
      carbs > 1000 ||
      !fat ||
      fat < 1 ||
      fat > 1000
    ) {
      setGoalError('Macros must be between 1 and 1000 g')
      return
    }

    const calorieLower = Math.min(lower, upper)
    const calorieUpper = Math.max(lower, upper)
    updateGoals({
      calorieGoalLower: calorieLower,
      calorieGoalUpper: calorieUpper,
      proteinGoal: protein,
      carbsGoal: carbs,
      fatGoal: fat,
    })
    setCalorieLowerDraft(String(calorieLower))
    setCalorieUpperDraft(String(calorieUpper))
    setProteinDraft(String(protein))
    setCarbsDraft(String(carbs))
    setFatDraft(String(fat))
    setGoalError(null)
    setEditingGoals(false)
    setGoalSaved(true)
    window.setTimeout(() => setGoalSaved(false), 1500)
  }

  async function handleNameSave() {
    setNameError(null)
    try {
      await updateDisplayName(nameDraft)
      setNameSaved(true)
      setEditingName(false)
      window.setTimeout(() => setNameSaved(false), 1500)
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Could not update name')
      setNameDraft(getDisplayName(user))
    }
  }

  async function loadSampleData() {
    if (
      !window.confirm(
        'Replace ALL meals and weight entries for THIS account with sample data?\n\nUse this only on a demo account — not your real tracking account.',
      )
    ) {
      return
    }
    setDataBusy(true)
    setDataError(null)
    try {
      await seedSampleData()
      window.location.reload()
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Could not load sample data')
      setDataBusy(false)
    }
  }

  async function handleBackfillIngredients() {
    if (
      !window.confirm(
        'Suggest ingredient tags for meals that have none?\n\nUses AI on each meal description (may take a while / hit free-tier limits). You can edit tags later on each entry.',
      )
    ) {
      return
    }
    setBackfillBusy(true)
    setBackfillMessage(null)
    setDataError(null)
    setBackfillProgress({ total: 0, done: 0, updated: 0, skipped: 0, failed: 0 })
    try {
      const result = await backfillMealIngredients(setBackfillProgress)
      setBackfillMessage(
        `Done — updated ${result.updated}, skipped ${result.skipped}, failed ${result.failed} of ${result.total}.`,
      )
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Backfill failed')
    } finally {
      setBackfillBusy(false)
    }
  }

  async function handleSwitchAccount(userId: string) {
    setAccountError(null)
    setAccountBusy(true)
    try {
      await switchAccount(userId)
      window.location.assign(`${import.meta.env.BASE_URL}`)
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Could not switch account')
      setAccountBusy(false)
    }
  }

  async function handleAddAccount() {
    setAccountError(null)
    setAccountBusy(true)
    try {
      await startAddAccount()
    } catch (err) {
      setAccountError(err instanceof Error ? err.message : 'Could not start add account')
      setAccountBusy(false)
    }
  }

  async function clearCloudData() {
    if (
      !window.confirm(
        'Delete all meals and weight entries for your account in the cloud? This cannot be undone.',
      )
    ) {
      return
    }
    setDataBusy(true)
    setDataError(null)
    try {
      await clearAllUserData()
      window.location.reload()
    } catch (err) {
      setDataError(err instanceof Error ? err.message : 'Could not clear data')
      setDataBusy(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
        <div className="flex items-center gap-3 px-4 py-3">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-teal-700 text-sm font-semibold text-white"
            aria-hidden
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-base font-semibold text-stone-900 dark:text-stone-50">
              {displayName}
              {nameSaved && (
                <span className="ml-2 text-xs font-medium text-teal-700 dark:text-teal-400">
                  Saved
                </span>
              )}
            </h2>
            <p className="truncate text-xs text-stone-500 dark:text-stone-400">{user?.email}</p>
          </div>
          <div className="relative shrink-0" ref={accountMenuRef}>
            <button
              type="button"
              aria-label="Account options"
              aria-haspopup="menu"
              aria-expanded={accountMenuOpen}
              onClick={() => setAccountMenuOpen((open) => !open)}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            >
              <span className="text-lg leading-none" aria-hidden>
                ⋯
              </span>
            </button>
            {accountMenuOpen && (
              <div
                role="menu"
                className="absolute right-0 z-10 mt-1 w-48 overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-stone-200 dark:bg-stone-800 dark:ring-stone-600"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setAccountMenuOpen(false)
                    setNameError(null)
                    setNameDraft(getDisplayName(user))
                    setEditingName(true)
                  }}
                  className="block w-full px-3 py-2 text-left text-sm text-stone-700 hover:bg-stone-50 dark:text-stone-100 dark:hover:bg-stone-700"
                >
                  Edit display name
                </button>
              </div>
            )}
          </div>
        </div>

        {editingName && (
          <div className="border-t border-stone-100 px-4 py-3 dark:border-stone-800">
            <label className="block text-sm">
              <span className="mb-1 block text-stone-600 dark:text-stone-300">Display name</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  autoFocus
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') void handleNameSave()
                    if (e.key === 'Escape') {
                      setEditingName(false)
                      setNameError(null)
                      setNameDraft(getDisplayName(user))
                    }
                  }}
                  className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
                />
                <button
                  type="button"
                  onClick={() => void handleNameSave()}
                  className="shrink-0 rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800"
                >
                  Save
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEditingName(false)
                    setNameError(null)
                    setNameDraft(getDisplayName(user))
                  }}
                  className="shrink-0 rounded-lg px-3 py-2 text-sm font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
              </div>
              {nameError && (
                <p className="mt-1 text-xs text-red-600 dark:text-red-400">{nameError}</p>
              )}
            </label>
          </div>
        )}

        {accountError && (
          <p className="border-t border-stone-100 px-4 py-2 text-sm text-red-700 dark:border-stone-800 dark:text-red-300">
            {accountError}
          </p>
        )}

        {otherAccounts.map((account) => (
          <div key={account.userId}>
            <div className="border-t border-stone-100 dark:border-stone-800" />
            <div className="flex items-center gap-2 px-4 py-2">
              <button
                type="button"
                disabled={accountBusy}
                onClick={() => void handleSwitchAccount(account.userId)}
                className="flex min-w-0 flex-1 items-center gap-3 rounded-xl py-1 text-left hover:bg-stone-50 disabled:opacity-60 dark:hover:bg-stone-800"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-stone-400 text-xs font-semibold text-white">
                  {getInitials(account.displayName || account.email)}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-medium text-stone-800 dark:text-stone-100">
                    Switch to {account.displayName || 'account'}
                  </span>
                  <span className="block truncate text-xs text-stone-500 dark:text-stone-400">
                    {account.email}
                  </span>
                </span>
              </button>
              <button
                type="button"
                disabled={accountBusy}
                onClick={() => removeSavedAccountFromDevice(account.userId)}
                className="shrink-0 rounded-lg px-2 py-1 text-xs text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-800"
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="border-t border-stone-100 dark:border-stone-800" />
        <button
          type="button"
          disabled={accountBusy}
          onClick={() => void handleAddAccount()}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-teal-700 hover:bg-teal-50 disabled:opacity-60 dark:text-teal-400 dark:hover:bg-teal-950/30"
        >
          Add another account
          <span className="text-teal-400">→</span>
        </button>
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

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Goals
        </h2>
        <div className="space-y-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-medium text-stone-800 dark:text-stone-100">Calories</p>
            <div className="flex items-center gap-2">
              {goalSaved && (
                <span className="text-xs font-medium text-teal-700 dark:text-teal-400">Saved</span>
              )}
              {!editingGoals && (
                <button
                  type="button"
                  onClick={startEditGoals}
                  className="rounded-lg px-2 py-0.5 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
                >
                  Edit
                </button>
              )}
            </div>
          </div>

          {editingGoals ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <label className="block text-sm">
                  <span className="mb-0.5 block text-xs text-stone-600 dark:text-stone-300">
                    Lower goal
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={800}
                      max={6000}
                      step={50}
                      autoFocus
                      value={calorieLowerDraft}
                      onChange={(e) => setCalorieLowerDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGoalsSave()
                        if (e.key === 'Escape') cancelEditGoals()
                      }}
                      className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
                    />
                    <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">kcal</span>
                  </div>
                </label>

                <label className="block text-sm">
                  <span className="mb-0.5 block text-xs text-stone-600 dark:text-stone-300">
                    Higher limit
                  </span>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="number"
                      min={800}
                      max={6000}
                      step={50}
                      value={calorieUpperDraft}
                      onChange={(e) => setCalorieUpperDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGoalsSave()
                        if (e.key === 'Escape') cancelEditGoals()
                      }}
                      className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
                    />
                    <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">kcal</span>
                  </div>
                </label>
              </div>

              <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                Limits set diary dot colors
              </p>

              <div className="border-t border-stone-200 pt-2 dark:border-stone-700">
                <p className="mb-1.5 text-sm font-medium text-stone-800 dark:text-stone-100">
                  Macros
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <label className="block text-sm">
                    <span className="mb-0.5 block text-xs text-stone-600 dark:text-stone-300">
                      Protein
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        step={5}
                        value={proteinDraft}
                        onChange={(e) => setProteinDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGoalsSave()
                          if (e.key === 'Escape') cancelEditGoals()
                        }}
                        className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
                      />
                      <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">g</span>
                    </div>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-0.5 block text-xs text-stone-600 dark:text-stone-300">
                      Carbs
                    </span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        step={5}
                        value={carbsDraft}
                        onChange={(e) => setCarbsDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGoalsSave()
                          if (e.key === 'Escape') cancelEditGoals()
                        }}
                        className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
                      />
                      <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">g</span>
                    </div>
                  </label>
                  <label className="block text-sm">
                    <span className="mb-0.5 block text-xs text-stone-600 dark:text-stone-300">Fat</span>
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        min={1}
                        max={1000}
                        step={5}
                        value={fatDraft}
                        onChange={(e) => setFatDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleGoalsSave()
                          if (e.key === 'Escape') cancelEditGoals()
                        }}
                        className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
                      />
                      <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">g</span>
                    </div>
                  </label>
                </div>
              </div>

              {goalError && (
                <p className="text-xs text-red-600 dark:text-red-400">{goalError}</p>
              )}

              <div className="flex justify-end gap-1.5 border-t border-stone-200 pt-2 dark:border-stone-700">
                <button
                  type="button"
                  onClick={cancelEditGoals}
                  className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleGoalsSave}
                  className="rounded-lg bg-teal-700 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
                >
                  Save
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs text-stone-600 dark:text-stone-300">Lower goal</p>
                  <p className="font-medium text-stone-900 dark:text-stone-50">
                    {settings.calorieGoalLower.toLocaleString()}{' '}
                    <span className="font-normal text-stone-500 dark:text-stone-400">kcal</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-600 dark:text-stone-300">Higher limit</p>
                  <p className="font-medium text-stone-900 dark:text-stone-50">
                    {settings.calorieGoalUpper.toLocaleString()}{' '}
                    <span className="font-normal text-stone-500 dark:text-stone-400">kcal</span>
                  </p>
                </div>
              </div>

              <p className="truncate text-xs text-stone-500 dark:text-stone-400">
                Limits set diary dot colors
              </p>

              <div className="border-t border-stone-200 pt-2 dark:border-stone-700">
                <p className="mb-1.5 text-sm font-medium text-stone-800 dark:text-stone-100">
                  Macros
                </p>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <p className="text-xs text-stone-600 dark:text-stone-300">Protein</p>
                    <p className="font-medium text-stone-900 dark:text-stone-50">
                      {settings.proteinGoal}{' '}
                      <span className="font-normal text-stone-500 dark:text-stone-400">g</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-600 dark:text-stone-300">Carbs</p>
                    <p className="font-medium text-stone-900 dark:text-stone-50">
                      {settings.carbsGoal}{' '}
                      <span className="font-normal text-stone-500 dark:text-stone-400">g</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-stone-600 dark:text-stone-300">Fat</p>
                    <p className="font-medium text-stone-900 dark:text-stone-50">
                      {settings.fatGoal}{' '}
                      <span className="font-normal text-stone-500 dark:text-stone-400">g</span>
                    </p>
                  </div>
                </div>
              </div>
            </>
          )}
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
        {dataError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {dataError}
          </p>
        )}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
          <button
            type="button"
            disabled={dataBusy || backfillBusy}
            onClick={() => void handleBackfillIngredients()}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            Backfill ingredient tags
            <span className="text-stone-400">→</span>
          </button>
          <div className="border-t border-stone-100 dark:border-stone-800" />
          <button
            type="button"
            disabled={dataBusy || backfillBusy}
            onClick={() => void loadSampleData()}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-stone-800 hover:bg-stone-50 disabled:opacity-60 dark:text-stone-100 dark:hover:bg-stone-800"
          >
            Replace with sample data
            <span className="text-stone-400">→</span>
          </button>
          <div className="border-t border-stone-100 dark:border-stone-800" />
          <button
            type="button"
            disabled={dataBusy || backfillBusy}
            onClick={() => void clearCloudData()}
            className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Clear all cloud data
            <span className="text-red-300 dark:text-red-700">→</span>
          </button>
        </div>
        {backfillBusy && backfillProgress && (
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Backfilling {backfillProgress.done}/{backfillProgress.total}
            {backfillProgress.currentLabel ? ` — ${backfillProgress.currentLabel}` : ''}
          </p>
        )}
        {backfillMessage && (
          <p className="text-xs text-teal-700 dark:text-teal-400">{backfillMessage}</p>
        )}
        <p className="text-xs text-stone-500 dark:text-stone-400">
          Sample data wipes this account only. Prefer a demo account (switch above), then run sample
          there. Run the SQL migration for `ingredients` before backfill if you have not yet.
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Account
        </h2>
        <button
          type="button"
          disabled={accountBusy}
          onClick={() => void signOut()}
          className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-stone-800 shadow-sm ring-1 ring-stone-200 hover:bg-stone-50 disabled:opacity-60 dark:bg-stone-900 dark:text-stone-100 dark:ring-stone-700 dark:hover:bg-stone-800"
        >
          Sign out of this account
        </button>
        {savedAccounts.length > 1 && (
          <button
            type="button"
            disabled={accountBusy}
            onClick={() => void signOutAll()}
            className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-red-600 shadow-sm ring-1 ring-stone-200 hover:bg-red-50 disabled:opacity-60 dark:bg-stone-900 dark:text-red-400 dark:ring-stone-700 dark:hover:bg-red-950/40"
          >
            Sign out of all accounts on this device
          </button>
        )}
        <p className="text-center text-xs text-stone-400 dark:text-stone-500">
          Calorie Tracker · v0.1.0 · synced with Supabase
        </p>
      </section>
    </div>
  )
}
