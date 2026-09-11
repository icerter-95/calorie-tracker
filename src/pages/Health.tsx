/**
 * Health. Body vitals: latest weight and 7-day step average up top, then the
 * weight trend and a 30-day step histogram. Tap the weight figure to log
 * today's reading. Apple Health sync is batch, not live.
 */
import { useCallback, useMemo, useState } from 'react'
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
import { addWeight, deleteWeight, updateWeight } from '../db'
import { useAllSteps, useAllWeights } from '../hooks/useData'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import { useChartColors } from '../lib/chartColors'
import { formatDisplayDate, formatShortDate, getLastDaysRange, todayKey } from '../lib/dates'
import type { WeightEntry } from '../types'

/** Default daily steps target used for histogram coloring. */
const STEP_GOAL = 10_000

/** Today's manual reading, if any — Health tap updates this instead of inserting another. */
function pickTodayManual(weights: WeightEntry[] | undefined, date: string): WeightEntry | null {
  if (!weights?.length) return null
  const manuals = weights.filter((entry) => entry.date === date && entry.source === 'manual')
  if (manuals.length === 0) return null
  return manuals.reduce((newest, entry) => (entry.createdAt > newest.createdAt ? entry : newest))
}

export default function HealthPage() {
  const colors = useChartColors()
  const navigate = useNavigate()
  const { weights, error: weightsError, reload: reloadWeights } = useAllWeights()
  const { steps, error: stepsError, reload: reloadSteps } = useAllSteps()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<WeightEntry | null>(null)

  const pullToRefresh = useCallback(async () => {
    await Promise.all([reloadWeights(), reloadSteps()])
  }, [reloadWeights, reloadSteps])

  useRegisterPullToRefresh(pullToRefresh)

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
  const previous = weights && weights.length > 1 ? weights[weights.length - 2] : undefined
  const weightDelta =
    latest && previous ? latest.weightKg - previous.weightKg : null

  const yDomain = useMemo(() => {
    if (!weights?.length) return [70, 90] as [number, number]
    const values = weights.map((w) => w.weightKg)
    const min = Math.min(...values)
    const max = Math.max(...values)
    const pad = Math.max(1, (max - min) * 0.15)
    return [Math.floor(min - pad), Math.ceil(max + pad)] as [number, number]
  }, [weights])

  function openWeightForm() {
    setEditing(pickTodayManual(weights, todayKey()))
    setShowForm(true)
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

  async function handleDelete() {
    if (!editing) return
    await deleteWeight(editing.id)
    setShowForm(false)
    setEditing(null)
    reloadWeights()
  }

  const error = weightsError ?? stepsError

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-strong">
          {error}
        </p>
      )}

      <section className="grid grid-cols-2 gap-4 border-b border-line pb-5">
        <button
          type="button"
          onClick={openWeightForm}
          aria-label={latest ? `Log weight, current ${latest.weightKg} kilograms` : 'Log weight'}
          className="-m-1 min-w-0 rounded-xl p-1 text-left transition-colors hover:bg-hover/70 active:bg-hover"
        >
          <p className="text-[10px] font-medium uppercase tracking-widest text-content-muted">
            Weight
          </p>
          <p className="mt-1 text-[2.125rem] font-semibold tabular-nums tracking-tight text-content">
            {latest ? latest.weightKg : '—'}
            {latest && <span className="ml-1 text-sm font-normal text-content-faint">kg</span>}
          </p>
          <p className="mt-1 text-xs text-content-faint">
            {latest
              ? `${formatShortDate(latest.date)}${
                  weightDelta == null
                    ? ''
                    : weightDelta === 0
                      ? ' · no change'
                      : ` · ${weightDelta > 0 ? '+' : '−'}${Math.abs(weightDelta).toFixed(1)} kg`
                }`
              : 'Tap to log'}
          </p>
        </button>

        <div className="min-w-0">
          <p className="text-[10px] font-medium uppercase tracking-widest text-content-muted">
            Steps
          </p>
          <p className="mt-1 text-[2.125rem] font-semibold tabular-nums tracking-tight text-content">
            {steps === undefined
              ? '…'
              : stepsAvg7 != null
                ? stepsAvg7.toLocaleString()
                : '—'}
          </p>
          <p className="mt-1 text-xs text-content-faint">
            {steps === undefined
              ? 'Loading…'
              : stepsAvg7 != null
                ? `7-day avg · ${STEP_GOAL.toLocaleString()} goal`
                : latestSteps
                  ? `Last sync ${formatDisplayDate(latestSteps.date)}`
                  : 'Not synced'}
          </p>
        </div>
      </section>

      <section>
        <div className="mb-1 flex items-baseline justify-between gap-2">
          <p className="text-[10px] font-medium uppercase tracking-widest text-content-muted">
            Weight trend
          </p>
          <button
            type="button"
            onClick={() => navigate('/health/weight-history')}
            className="text-xs font-medium text-content-muted hover:text-content"
          >
            History
          </button>
        </div>
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={128}>
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
          <p className="py-8 text-center text-sm text-content-faint">
            Log a weight to see your trend.
          </p>
        )}
      </section>

      <section>
        <p className="text-[10px] font-medium uppercase tracking-widest text-content-muted">
          Steps · 30 days
        </p>
        <div className="mt-1">
          {steps === undefined ? (
            <p className="py-8 text-center text-sm text-content-faint">Loading steps…</p>
          ) : stepsChartData.some((d) => d.steps > 0) ? (
            <ResponsiveContainer width="100%" height={140}>
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
            <p className="py-8 text-center text-sm text-content-faint">
              {latestSteps
                ? 'No steps in the last 30 days. Run a last-30-days Health sync, then pull to refresh.'
                : 'Connect Apple Health in Profile → Connections to sync steps.'}
            </p>
          )}
        </div>
        <p className="mt-1 text-xs text-content-faint">iPhone sync · not live during the day</p>
      </section>

      {showForm && (
        <WeightSheet
          initial={editing}
          suggestedWeightKg={latest?.weightKg}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditing(null)
          }}
          onDelete={editing ? () => void handleDelete() : undefined}
        />
      )}
    </div>
  )
}
