import { useState } from 'react'
import { clearAllUserData } from '../../db'
import { seedSampleData } from '../../db/seed'
import {
  backfillMealIngredients,
  type BackfillProgress,
} from '../../lib/backfillIngredients'

export default function DataSettings() {
  const [dataBusy, setDataBusy] = useState(false)
  const [dataError, setDataError] = useState<string | null>(null)
  const [backfillBusy, setBackfillBusy] = useState(false)
  const [backfillProgress, setBackfillProgress] = useState<BackfillProgress | null>(null)
  const [backfillMessage, setBackfillMessage] = useState<string | null>(null)

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
    <div className="space-y-3">
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
        Sample data wipes this account only. Prefer a demo account (switch from the user header),
        then run sample there. Run the SQL migration for `ingredients` before backfill if you have
        not yet.
      </p>
    </div>
  )
}
