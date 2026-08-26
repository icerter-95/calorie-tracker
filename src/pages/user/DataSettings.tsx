/**
 * Data settings. Backfill missing ingredient tags with AI, load demo meals,
 * or wipe this account's cloud data.
 */
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

  // Destructive cloud actions — each confirms first.
  async function loadSampleData() {
    if (
      !window.confirm(
        'Replace ALL meals, weight, and steps for THIS account with sample data?\n\nUse this only on a demo account — not your real tracking account. Steps from Apple Health will be deleted.',
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
        'Delete all meals, weight, and steps for your account in the cloud? This cannot be undone.',
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
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-strong">
          {dataError}
        </p>
      )}
      <div className="overflow-hidden rounded-2xl bg-raised ring-1 ring-line">
        {/* Backfill tags, load demo data, or wipe the account */}
        <button
          type="button"
          disabled={dataBusy || backfillBusy}
          onClick={() => void handleBackfillIngredients()}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-content hover:bg-hover disabled:opacity-60"
        >
          Backfill ingredient tags
          <span className="text-content-faint">→</span>
        </button>
        <div className="border-t border-divider" />
        <button
          type="button"
          disabled={dataBusy || backfillBusy}
          onClick={() => void loadSampleData()}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-content hover:bg-hover disabled:opacity-60"
        >
          Replace with sample data
          <span className="text-content-faint">→</span>
        </button>
        <div className="border-t border-divider" />
        <button
          type="button"
          disabled={dataBusy || backfillBusy}
          onClick={() => void clearCloudData()}
          className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-danger hover:bg-danger-soft disabled:opacity-60"
        >
          Clear all cloud data
          <span className="text-danger/50">→</span>
        </button>
      </div>
      {backfillBusy && backfillProgress && (
        <p className="text-xs text-content-subtle">
          Backfilling {backfillProgress.done}/{backfillProgress.total}
          {backfillProgress.currentLabel ? ` — ${backfillProgress.currentLabel}` : ''}
        </p>
      )}
      {backfillMessage && (
        <p className="text-xs text-accent-ink">{backfillMessage}</p>
      )}
      <p className="text-xs text-content-subtle">
        Sample data wipes this account only. Prefer a demo account (switch from the user header),
        then run sample there. Run the SQL migration for `ingredients` before backfill if you have
        not yet.
      </p>
    </div>
  )
}
