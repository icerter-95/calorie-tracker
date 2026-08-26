/**
 * Full list of weight entries (from Health → Weight history). Edit, delete,
 * or add a manual log. Apple Health rows show a sync timestamp.
 */
import { useCallback, useState } from 'react'
import WeightSheet, { type WeightPayload } from '../components/WeightSheet'
import { addWeight, deleteWeight, updateWeight } from '../db'
import { useAllWeights } from '../hooks/useData'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import { formatShortDate } from '../lib/dates'
import type { WeightEntry } from '../types'

function formatSyncLabel(ts?: number) {
  if (!ts) return null
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function WeightHistoryPage() {
  const { weights, error: weightsError, reload: reloadWeights } = useAllWeights()
  const [showForm, setShowForm] = useState(false)

  const pullToRefresh = useCallback(async () => {
    await reloadWeights()
  }, [reloadWeights])

  useRegisterPullToRefresh(pullToRefresh)
  const [editing, setEditing] = useState<WeightEntry | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  function openEditForm(entry: WeightEntry) {
    setEditing(entry)
    setShowForm(true)
  }

  async function handleSave(payload: WeightPayload) {
    setActionError(null)
    if (editing) {
      await updateWeight(editing.id, payload)
    } else {
      await addWeight(payload)
    }
    setShowForm(false)
    setEditing(null)
    reloadWeights()
  }

  // Confirmation lives in the sheet's action bar.
  async function handleDelete(id: string) {
    setActionError(null)
    try {
      await deleteWeight(id)
      setShowForm(false)
      setEditing(null)
      reloadWeights()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete weight')
    }
  }

  const entries = [...(weights ?? [])].reverse()

  return (
    <div className="space-y-3">
      {(weightsError || actionError) && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {actionError ?? weightsError}
        </p>
      )}

      {entries.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-stone-500 ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700">
          No weight entries yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <button
                type="button"
                onClick={() => openEditForm(entry)}
                className="flex w-full items-center justify-between gap-3 rounded-xl bg-white px-4 py-3 text-left ring-1 ring-stone-200 transition hover:bg-stone-50 dark:bg-stone-900 dark:ring-stone-700 dark:hover:bg-stone-800"
              >
                <span>
                  <span className="block font-medium tabular-nums text-stone-900 dark:text-stone-50">
                    {entry.weightKg} kg
                  </span>
                  <span className="block text-sm text-stone-500 dark:text-stone-400">
                    {formatShortDate(entry.date)}
                    {entry.source === 'apple-health' ? ' · Apple Health' : ' · Manual'}
                    {entry.syncedAt ? ` · ${formatSyncLabel(entry.syncedAt)}` : ''}
                  </span>
                </span>
                <span aria-hidden className="shrink-0 text-stone-400 dark:text-stone-500">
                  ›
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {showForm && (
        <WeightSheet
          initial={editing}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onDelete={editing ? () => void handleDelete(editing.id) : undefined}
        />
      )}
    </div>
  )
}
