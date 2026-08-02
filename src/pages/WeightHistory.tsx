import { useState } from 'react'
import { addWeight, deleteWeight, updateWeight } from '../db'
import { useAllWeights } from '../hooks/useData'
import { formatShortDate, todayKey } from '../lib/dates'
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
  const [editing, setEditing] = useState<WeightEntry | null>(null)
  const [date, setDate] = useState(todayKey())
  const [weightKg, setWeightKg] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  function openEditForm(entry: WeightEntry) {
    setEditing(entry)
    setDate(entry.date)
    setWeightKg(String(entry.weightKg))
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = Number(weightKg)
    if (!parsed || parsed <= 0) return

    const payload = {
      date,
      weightKg: parsed,
    }

    setActionError(null)
    try {
      if (editing) {
        await updateWeight(editing.id, payload)
      } else {
        await addWeight(payload)
      }
      setShowForm(false)
      setEditing(null)
      reloadWeights()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save weight')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this weight entry?')) return
    setActionError(null)
    try {
      await deleteWeight(id)
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

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700"
        >
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-stone-900 dark:text-stone-50">
              {editing ? 'Edit entry' : 'Log weight'}
            </h2>
            <button
              type="button"
              onClick={() => {
                setShowForm(false)
                setEditing(null)
              }}
              className="text-sm text-stone-500 dark:text-stone-400"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="block text-sm">
              <span className="mb-1 block text-stone-600 dark:text-stone-300">Date</span>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-stone-600 dark:text-stone-300">Weight (kg)</span>
              <input
                type="number"
                required
                min={0}
                step={0.1}
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
              />
            </label>
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-amber-700 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Save
          </button>
        </form>
      )}

      {entries.length === 0 ? (
        <p className="rounded-2xl bg-white px-4 py-8 text-center text-sm text-stone-500 ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700">
          No weight entries yet.
        </p>
      ) : (
        <ul className="space-y-2">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700"
            >
              <div>
                <p className="font-medium tabular-nums text-stone-900 dark:text-stone-50">
                  {entry.weightKg} kg
                </p>
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  {formatShortDate(entry.date)}
                  {entry.source === 'apple-health' ? ' · Apple Health' : ' · Manual'}
                  {entry.syncedAt ? ` · ${formatSyncLabel(entry.syncedAt)}` : ''}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => openEditForm(entry)}
                  className="text-sm text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-50"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => void handleDelete(entry.id)}
                  className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                >
                  Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
