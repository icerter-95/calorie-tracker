import { useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { addWeight, deleteWeight, updateWeight } from '../db'
import { useAllWeights } from '../hooks/useData'
import { formatShortDate, todayKey } from '../lib/dates'
import type { WeightEntry } from '../types'

export default function WeightPage() {
  const { weights, error, reload } = useAllWeights()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<WeightEntry | null>(null)
  const [date, setDate] = useState(todayKey())
  const [weightKg, setWeightKg] = useState('')
  const [note, setNote] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)

  const chartData = useMemo(
    () =>
      (weights ?? []).map((w) => ({
        ...w,
        label: formatShortDate(w.date),
      })),
    [weights],
  )

  const latest = weights?.length ? weights[weights.length - 1] : undefined

  const yDomain = useMemo(() => {
    if (!weights?.length) return [70, 90] as [number, number]
    const values = weights.map((w) => w.weightKg)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = Math.max(1, (max - min) * 0.15)
    return [Math.floor(min - pad), Math.ceil(max + pad)] as [number, number]
  }, [weights])

  function openNewForm() {
    setEditing(null)
    setDate(todayKey())
    setWeightKg('')
    setNote('')
    setShowForm(true)
  }

  function openEditForm(entry: WeightEntry) {
    setEditing(entry)
    setDate(entry.date)
    setWeightKg(String(entry.weightKg))
    setNote(entry.note ?? '')
    setShowForm(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = Number(weightKg)
    if (!parsed || parsed <= 0) return

    const payload = {
      date,
      weightKg: parsed,
      note: note.trim() || undefined,
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
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save weight')
    }
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this weight entry?')) return
    setActionError(null)
    try {
      await deleteWeight(id)
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete weight')
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-amber-700 p-5 text-white shadow-sm">
        <p className="text-sm text-amber-100">Latest weight</p>
        <p className="mt-1 text-3xl font-bold">
          {latest ? `${latest.weightKg} kg` : '—'}
        </p>
        {latest && <p className="text-sm text-amber-100">{formatShortDate(latest.date)}</p>}
      </section>

      {(error || actionError) && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {actionError ?? error}
        </p>
      )}

      {!showForm ? (
        <button
          onClick={openNewForm}
          className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-amber-800 shadow-sm ring-1 ring-stone-200 hover:bg-amber-50 dark:bg-stone-900 dark:text-amber-400 dark:ring-stone-700 dark:hover:bg-stone-800"
        >
          + Log weight
        </button>
      ) : (
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
          <label className="block text-sm">
            <span className="mb-1 block text-stone-600 dark:text-stone-300">Note (optional)</span>
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
            />
          </label>
          <button
            type="submit"
            className="w-full rounded-xl bg-amber-700 py-2 text-sm font-medium text-white hover:bg-amber-800"
          >
            Save
          </button>
        </form>
      )}

      {chartData.length > 0 ? (
        <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
              <XAxis dataKey="label" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} tickMargin={6} domain={yDomain} />
              <Tooltip formatter={(v: number) => [`${v} kg`, 'Weight']} />
              <Line type="monotone" dataKey="weightKg" stroke="#b45309" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-2xl bg-white p-4 text-sm text-stone-500 ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700">
          No weight entries yet.
        </p>
      )}

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          History
        </h2>
        {(weights ?? []).length === 0 ? null : (
          <ul className="space-y-2">
            {[...(weights ?? [])].reverse().map((entry) => (
              <li
                key={entry.id}
                className="flex items-center justify-between rounded-xl bg-white px-4 py-3 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700"
              >
                <div>
                  <p className="font-medium text-stone-900 dark:text-stone-50">{entry.weightKg} kg</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400">
                    {formatShortDate(entry.date)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => openEditForm(entry)}
                    className="text-sm text-stone-600 hover:text-stone-900 dark:text-stone-300 dark:hover:text-stone-50"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
