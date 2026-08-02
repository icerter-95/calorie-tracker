import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { eachDayOfInterval, parseISO, subDays } from 'date-fns'
import { useNavigate } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { addWeight, updateWeight } from '../db'
import { useAllSteps, useAllWeights } from '../hooks/useData'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import { formatShortDate, todayKey, toDateKey } from '../lib/dates'
import type { WeightEntry } from '../types'

/** Default daily steps target used for histogram coloring. */
const STEP_GOAL = 10_000

const WEIGHT_STROKE = '#b45309'
const STEPS_MET = '#0f766e'
const STEPS_BELOW = '#a8a29e'
const GRID_STROKE = '#e7e5e4'

export default function HealthPage() {
  const navigate = useNavigate()
  const { weights, error: weightsError, reload: reloadWeights } = useAllWeights()
  const { steps, error: stepsError, reload: reloadSteps } = useAllSteps()
  const [showForm, setShowForm] = useState(false)

  const pullToRefresh = useCallback(async () => {
    await Promise.all([reloadWeights(), reloadSteps()])
  }, [reloadWeights, reloadSteps])

  useRegisterPullToRefresh(pullToRefresh)
  const [menuOpen, setMenuOpen] = useState(false)
  const [editing, setEditing] = useState<WeightEntry | null>(null)
  const [date, setDate] = useState(todayKey())
  const [weightKg, setWeightKg] = useState('')
  const [actionError, setActionError] = useState<string | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [menuOpen])

  const chartData = useMemo(
    () =>
      (weights ?? []).map((w) => ({
        ...w,
        label: formatShortDate(w.date),
      })),
    [weights],
  )

  const last7Keys = useMemo(() => {
    const end = parseISO(todayKey())
    const start = subDays(end, 6)
    return eachDayOfInterval({ start, end }).map(toDateKey)
  }, [])

  const stepsByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of steps ?? []) {
      map.set(entry.date, entry.steps)
    }
    return map
  }, [steps])

  const stepsChartData = useMemo(
    () =>
      last7Keys.map((dateKey) => {
        const value = stepsByDate.get(dateKey) ?? 0
        return {
          date: dateKey,
          label: formatShortDate(dateKey),
          steps: value,
          metGoal: value >= STEP_GOAL,
        }
      }),
    [last7Keys, stepsByDate],
  )

  const stepsAvg7 = useMemo(() => {
    const present = last7Keys
      .map((key) => stepsByDate.get(key))
      .filter((v): v is number => v != null)
    if (present.length === 0) return null
    return Math.round(present.reduce((sum, v) => sum + v, 0) / present.length)
  }, [last7Keys, stepsByDate])

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
    setShowForm(true)
    setMenuOpen(false)
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

  const error = weightsError ?? stepsError

  return (
    <div className="space-y-3">
      {(error || actionError) && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {actionError ?? error}
        </p>
      )}

      {/* Weight card */}
      <section className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-amber-800/80 dark:text-amber-400/90">
            Weight
          </p>

          <div className="relative flex items-center gap-3" ref={menuRef}>
            <button
              type="button"
              aria-label="Weight options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-stone-500 transition hover:bg-stone-100 hover:text-stone-800 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-200"
            >
              <span aria-hidden className="flex items-center gap-[3px]">
                <span className="block h-[3px] w-[3px] rounded-full bg-current" />
                <span className="block h-[3px] w-[3px] rounded-full bg-current" />
                <span className="block h-[3px] w-[3px] rounded-full bg-current" />
              </span>
            </button>

            {!showForm && (
              <button
                type="button"
                aria-label="Log weight"
                onClick={openNewForm}
                className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-700 text-base font-semibold leading-none text-white shadow-sm hover:bg-amber-800"
              >
                <span aria-hidden className="-mt-px">
                  +
                </span>
              </button>
            )}

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] overflow-hidden rounded-xl bg-white py-1 shadow-lg ring-1 ring-stone-200 dark:bg-stone-800 dark:ring-stone-600"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/health/weight-history')
                  }}
                  className="block w-full px-3 py-2 text-left text-sm font-medium text-stone-800 hover:bg-stone-50 dark:text-stone-100 dark:hover:bg-stone-700"
                >
                  Weight history
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-stone-900 dark:text-stone-50">
          {latest ? `${latest.weightKg}` : '—'}
          {latest && (
            <span className="ml-1.5 text-lg font-semibold text-stone-500 dark:text-stone-400">kg</span>
          )}
        </p>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {latest
            ? `Latest weight — ${formatShortDate(latest.date)}${
                latest.source === 'apple-health' ? ' · Health' : ''
              }`
            : 'No weight logged yet'}
        </p>

        {showForm && (
          <form
            onSubmit={handleSubmit}
            className="mt-4 space-y-3 rounded-xl bg-stone-50 p-3 ring-1 ring-stone-200 dark:bg-stone-800/50 dark:ring-stone-700"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-stone-900 dark:text-stone-50">
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

        <div className="mt-3">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  width={36}
                  tickMargin={4}
                  domain={yDomain}
                />
                <Tooltip formatter={(v: number) => [`${v} kg`, 'Weight']} />
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  stroke={WEIGHT_STROKE}
                  strokeWidth={2}
                  dot={{ r: 3, fill: WEIGHT_STROKE }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="rounded-xl bg-stone-50 px-3 py-8 text-center text-sm text-stone-500 dark:bg-stone-800/50 dark:text-stone-400">
              Log a weight to see your trend.
            </p>
          )}
        </div>
      </section>

      {/* Steps card */}
      <section className="rounded-2xl bg-white p-3.5 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
        <p className="text-xs font-medium uppercase tracking-wide text-teal-800/80 dark:text-teal-400/90">
          Steps
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-stone-900 dark:text-stone-50">
          {stepsAvg7 != null ? stepsAvg7.toLocaleString() : '—'}
        </p>
        <p className="mt-1 text-sm text-stone-500 dark:text-stone-400">
          {stepsAvg7 != null
            ? `Daily average · last 7 days · goal ${STEP_GOAL.toLocaleString()}`
            : 'No steps synced yet'}
        </p>

        <div className="mt-3">
          {stepsChartData.some((d) => d.steps > 0) ? (
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={stepsChartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={GRID_STROKE} vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#78716c' }} />
                <YAxis
                  tick={{ fontSize: 11, fill: '#78716c' }}
                  width={40}
                  tickMargin={4}
                  tickFormatter={(v: number) =>
                    v >= 1000 ? `${Math.round(v / 1000)}k` : String(v)
                  }
                />
                <Tooltip
                  formatter={(v: number) => [v.toLocaleString(), 'Steps']}
                  labelFormatter={(_, payload) => {
                    const row = payload?.[0]?.payload
                    if (!row) return ''
                    return row.metGoal ? `${row.label} · goal met` : row.label
                  }}
                />
                <Bar dataKey="steps" radius={[4, 4, 0, 0]}>
                  {stepsChartData.map((entry) => (
                    <Cell
                      key={entry.date}
                      fill={entry.metGoal ? STEPS_MET : STEPS_BELOW}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="rounded-xl bg-stone-50 px-3 py-8 text-center text-sm text-stone-500 dark:bg-stone-800/50 dark:text-stone-400">
              Connect Apple Health in Profile → Connections to sync steps.
            </p>
          )}
        </div>

        <p className="mt-2 text-xs text-stone-400 dark:text-stone-500">
          iPhone sync · not live during the day
        </p>
      </section>
    </div>
  )
}
