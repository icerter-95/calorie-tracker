/**
 * Health. Latest weight + trend line, plus a 30-day steps chart (Apple Health
 * sync is batch, not live). Full weight history is a nested page.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
import WeightSheet, { type WeightPayload } from '../components/WeightSheet'
import { addWeight, updateWeight } from '../db'
import { useAllSteps, useAllWeights } from '../hooks/useData'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import { useChartColors } from '../lib/chartColors'
import { formatDisplayDate, formatShortDate, getLastDaysRange } from '../lib/dates'
import type { WeightEntry } from '../types'

/** Default daily steps target used for histogram coloring. */
const STEP_GOAL = 10_000

export default function HealthPage() {
  const colors = useChartColors()
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

  const last7Keys = useMemo(() => getLastDaysRange(7), [])
  const last30Keys = useMemo(() => getLastDaysRange(30), [])

  const stepsByDate = useMemo(() => {
    const map = new Map<string, number>()
    for (const entry of steps ?? []) {
      map.set(entry.date, entry.steps)
    }
    return map
  }, [steps])

  const latestSteps = useMemo(() => {
    if (!steps?.length) return null
    return steps[steps.length - 1] ?? null
  }, [steps])

  const stepsChartData = useMemo(
    () =>
      last30Keys.map((dateKey) => {
        const value = stepsByDate.get(dateKey) ?? 0
        return {
          date: dateKey,
          label: formatShortDate(dateKey),
          steps: value,
          metGoal: value >= STEP_GOAL,
        }
      }),
    [last30Keys, stepsByDate],
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
    setShowForm(true)
    setMenuOpen(false)
  }

  // Errors surface inside the sheet, so no page-level action error here.
  async function handleSave(payload: WeightPayload) {
    if (editing) {
      await updateWeight(editing.id, payload)
    } else {
      await addWeight(payload)
    }
    setShowForm(false)
    setEditing(null)
    reloadWeights()
  }

  const error = weightsError ?? stepsError

  return (
    <div className="space-y-3">
      {error && (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-strong">
          {error}
        </p>
      )}

      {/* Weight card: latest value, log form, trend line */}
      <section className="rounded-2xl bg-raised p-3.5 shadow-sm ring-1 ring-line">
        <div className="flex items-start justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wide text-health-ink/80">
            Weight
          </p>

          <div className="relative flex items-center gap-3" ref={menuRef}>
            <button
              type="button"
              aria-label="Weight options"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((value) => !value)}
              className="flex h-7 w-7 items-center justify-center rounded-full text-content-subtle transition hover:bg-hover hover:text-content-muted"
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
                className="flex h-7 w-7 items-center justify-center rounded-full bg-health text-base font-semibold leading-none text-white shadow-sm hover:bg-health-hover"
              >
                <span aria-hidden className="-mt-px">
                  +
                </span>
              </button>
            )}

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-full z-20 mt-1 min-w-[11rem] overflow-hidden rounded-xl bg-field py-1 shadow-lg ring-1 ring-line"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false)
                    navigate('/health/weight-history')
                  }}
                  className="block w-full px-3 py-2 text-left text-sm font-medium text-content hover:bg-hover"
                >
                  Weight history
                </button>
              </div>
            )}
          </div>
        </div>

        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-content">
          {latest ? `${latest.weightKg}` : '—'}
          {latest && (
            <span className="ml-1.5 text-lg font-semibold text-content-subtle">kg</span>
          )}
        </p>
        <p className="mt-1 text-sm text-content-subtle">
          {latest
            ? `Latest weight — ${formatShortDate(latest.date)}${
                latest.source === 'apple-health' ? ' · Health' : ''
              }`
            : 'No weight logged yet'}
        </p>

        <div className="mt-3">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: colors.axis }} />
                <YAxis
                  tick={{ fontSize: 11, fill: colors.axis }}
                  width={36}
                  tickMargin={4}
                  domain={yDomain}
                />
                <Tooltip formatter={(v: number) => [`${v} kg`, 'Weight']} />
                <Line
                  type="monotone"
                  dataKey="weightKg"
                  stroke={colors.health}
                  strokeWidth={2}
                  dot={{ r: 3, fill: colors.health }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="rounded-xl bg-sunken px-3 py-8 text-center text-sm text-content-subtle">
              Log a weight to see your trend.
            </p>
          )}
        </div>
      </section>

      {/* Steps card: 7-day average + bars colored by 10k goal */}
      <section className="rounded-2xl bg-raised p-3.5 shadow-sm ring-1 ring-line">
        <p className="text-xs font-medium uppercase tracking-wide text-accent-ink/80">
          Steps
        </p>
        <p className="mt-1 text-4xl font-bold tabular-nums tracking-tight text-content">
          {steps === undefined
            ? '…'
            : stepsAvg7 != null
              ? stepsAvg7.toLocaleString()
              : '—'}
        </p>
        <p className="mt-1 text-sm text-content-subtle">
          {steps === undefined
            ? 'Loading steps…'
            : stepsAvg7 != null
              ? `Daily average · last 7 days · goal ${STEP_GOAL.toLocaleString()}`
              : latestSteps
                ? `Last sync ${formatDisplayDate(latestSteps.date)} · ${latestSteps.steps.toLocaleString()} steps (outside last 7 days)`
                : 'No steps synced yet'}
        </p>

        <div className="mt-3">
          {steps === undefined ? (
            <p className="rounded-xl bg-sunken px-3 py-8 text-center text-sm text-content-subtle">
              Loading steps…
            </p>
          ) : stepsChartData.some((d) => d.steps > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={stepsChartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={colors.grid} vertical={false} />
                <XAxis
                  dataKey="label"
                  interval={4}
                  tick={{ fontSize: 10, fill: colors.axis }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: colors.axis }}
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
                      fill={entry.metGoal ? colors.accent : colors.faint}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="rounded-xl bg-sunken px-3 py-8 text-center text-sm text-content-subtle">
              {latestSteps
                ? 'No steps in the last 30 days. Run a last-30-days Health sync, then pull to refresh.'
                : 'Connect Apple Health in Profile → Connections to sync steps.'}
            </p>
          )}
        </div>

        <p className="mt-2 text-xs text-content-faint">
          Last 30 days · iPhone sync · not live during the day
        </p>
      </section>

      {showForm && (
        <WeightSheet
          initial={editing}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
        />
      )}
    </div>
  )
}
