/**
 * Progress. Charts calories (and optional weight) over a date range, then
 * lets you tap a day to see and edit that day's meals.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import CalorieChart from '../components/CalorieChart'
import MealCard from '../components/MealCard'
import MealForm from '../components/MealForm'
import PeriodStats from '../components/PeriodStats'
import { addMeal } from '../db'
import { useAllMeals, useAllSteps, useAllWeights } from '../hooks/useData'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import {
  buildDailySummaries,
  defaultCustomRange,
  formatDisplayDate,
  formatShortDate,
  getCustomRange,
  getLastDaysRange,
  sumCaloriesForDate,
  todayKey,
} from '../lib/dates'
import { defaultMealTypeForNow } from '../lib/mealTypeDefaults'
import type { MealEntry, MealInput, MealType } from '../types'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../types'

type Range = 'week' | 'month' | 'custom'

const RANGE_LABELS: Record<Range, string> = {
  week: 'Last 7 days',
  month: 'Last 30 days',
  custom: 'Custom',
}

export default function HistoryPage() {
  // Range picker, selected chart day, and add/edit meal state.
  const initialCustom = defaultCustomRange()
  const [range, setRange] = useState<Range>('week')
  const [customStart, setCustomStart] = useState(initialCustom.start)
  const [customEnd, setCustomEnd] = useState(initialCustom.end)
  const [showWeight, setShowWeight] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [adding, setAdding] = useState(false)
  const [defaultMealType, setDefaultMealType] = useState<MealType>(defaultMealTypeForNow)
  const [actionError, setActionError] = useState<string | null>(null)
  const { meals, error: mealsError, reload: reloadMeals } = useAllMeals()
  const { weights, error: weightsError, reload: reloadWeights } = useAllWeights()
  const { steps, error: stepsError, reload: reloadSteps } = useAllSteps()

  const pullToRefresh = useCallback(async () => {
    await Promise.all([reloadMeals(), reloadWeights(), reloadSteps()])
  }, [reloadMeals, reloadWeights, reloadSteps])

  useRegisterPullToRefresh(pullToRefresh)

  // Date keys for the chosen range (7 days, 30 days, or custom).
  const dateKeys = useMemo(() => {
    if (range === 'week') return getLastDaysRange(7)
    if (range === 'month') return getLastDaysRange(30)
    return getCustomRange(customStart, customEnd)
  }, [range, customStart, customEnd])

  useEffect(() => {
    setSelectedDate(null)
    setAdding(false)
  }, [range, customStart, customEnd])

  useEffect(() => {
    setAdding(false)
  }, [selectedDate])

  function closeForm() {
    setAdding(false)
  }

  const summaries = useMemo(
    () => buildDailySummaries(meals ?? [], dateKeys),
    [meals, dateKeys],
  )

  // Meals for the day tapped on the chart.

  const selectedDayMeals = useMemo(() => {
    if (!selectedDate || !meals) return []
    return meals
      .filter((m) => m.date === selectedDate)
      .sort((a, b) => a.createdAt - b.createdAt)
  }, [meals, selectedDate])

  const selectedDayTotal = useMemo(() => {
    if (!selectedDate || !meals) return 0
    return sumCaloriesForDate(meals, selectedDate)
  }, [meals, selectedDate])

  const selectedBySlot = useMemo(() => {
    const map = Object.fromEntries(MEAL_TYPE_ORDER.map((t) => [t, [] as MealEntry[]])) as Record<
      MealType,
      MealEntry[]
    >
    for (const meal of selectedDayMeals) {
      map[meal.mealType].push(meal)
    }
    return map
  }, [selectedDayMeals])

  const today = todayKey()
  const datesWithEntries = useMemo(() => {
    const set = new Set<string>()
    for (const meal of meals ?? []) set.add(meal.date)
    return set
  }, [meals])

  // Days logged: any day in range with at least one meal entry.
  const activeDays = summaries.filter((d) => datesWithEntries.has(d.date)).length

  // Averages only use finished days (exclude today) that have entries,
  // so an in-progress day doesn't pull the daily average down.
  const finishedLoggedSummaries = summaries.filter(
    (d) => d.date < today && datesWithEntries.has(d.date),
  )
  const average =
    finishedLoggedSummaries.length > 0
      ? Math.round(
          finishedLoggedSummaries.reduce((sum, d) => sum + d.totalCalories, 0) /
            finishedLoggedSummaries.length,
        )
      : 0

  const stepsInRange = useMemo(() => {
    const set = new Set(dateKeys)
    return (steps ?? []).filter((s) => set.has(s.date))
  }, [steps, dateKeys])

  const finishedSteps = stepsInRange.filter((s) => s.date < today)
  const stepsAvg =
    finishedSteps.length > 0
      ? Math.round(finishedSteps.reduce((sum, s) => sum + s.steps, 0) / finishedSteps.length)
      : null

  const customFootnote =
    range === 'custom' && dateKeys.length > 0
      ? `${formatShortDate(dateKeys[0]!)} – ${formatShortDate(dateKeys[dateKeys.length - 1]!)}`
      : undefined

  const chartHeight = dateKeys.length > 20 ? 320 : 280

  // Editing and deleting live on the meal detail page, reached by tapping a card.
  async function handleSave(data: MealInput) {
    setActionError(null)
    try {
      await addMeal(data)
      closeForm()
      reloadMeals()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save meal')
    }
  }

  function startAdd(slot?: MealType) {
    setDefaultMealType(slot ?? defaultMealTypeForNow())
    setAdding(true)
  }

  return (
    <div className="space-y-4">
      {/* Range buttons + optional custom from/to dates */}
      <section className="space-y-2">
        <div className="flex gap-2">
          {(['week', 'month', 'custom'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                range === r
                  ? 'bg-accent text-on-accent'
                  : 'bg-raised text-content-muted ring-1 ring-line hover:bg-hover'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-content-muted">From</span>
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full min-w-0 max-w-full rounded-lg border border-line-strong bg-field px-2 py-2 text-sm text-content"
              />
            </label>
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-content-muted">To</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full min-w-0 max-w-full rounded-lg border border-line-strong bg-field px-2 py-2 text-sm text-content"
              />
            </label>
          </div>
        )}
      </section>

      <PeriodStats
        daysLogged={activeDays}
        avgCalories={average}
        avgSteps={stepsAvg}
        footnote={customFootnote}
      />

      <label className="flex items-center gap-2 text-sm text-content-muted">
        <input
          type="checkbox"
          checked={showWeight}
          onChange={(e) => setShowWeight(e.target.checked)}
          className="rounded border-line-strong text-accent focus:ring-accent"
        />
        Overlay weight (kg)
      </label>

      <CalorieChart
        data={summaries}
        weights={weights ?? []}
        showWeight={showWeight}
        height={chartHeight}
        selectedDate={selectedDate}
        onDaySelect={setSelectedDate}
      />

      <p className="text-center text-xs text-content-subtle">
        {selectedDate ? 'Selected day — tap another bar to switch' : 'Tap a bar to view meals for that day'}
      </p>

      {(mealsError || weightsError || stepsError || actionError) && (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-strong">
          {actionError ?? mealsError ?? weightsError ?? stepsError}
        </p>
      )}

      {selectedDate && (
        <section className="space-y-3">
          {/* Meals for the day selected on the chart */}
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-sm font-semibold text-content">
              {formatDisplayDate(selectedDate)}
            </h2>
            <span className="text-sm font-medium text-accent-ink">
              {selectedDayTotal} kcal
            </span>
          </div>

          <button
            type="button"
            onClick={() => startAdd()}
            className="w-full rounded-2xl bg-raised py-3 text-sm font-medium text-accent-ink shadow-sm ring-1 ring-line hover:bg-accent-soft"
          >
            + Add meal
          </button>

          {meals === undefined ? (
            <p className="text-sm text-content-subtle">Loading…</p>
          ) : selectedDayMeals.length === 0 ? (
            <p className="rounded-2xl bg-raised p-4 text-sm text-content-subtle ring-1 ring-line">
              No entries on this day. Tap “Add meal” to log one.
            </p>
          ) : (
            MEAL_TYPE_ORDER.map((slot) => {
              const slotMeals = selectedBySlot[slot]
              if (slotMeals.length === 0) return null
              return (
                <div key={slot} className="space-y-2">
                  <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-content-subtle">
                    {MEAL_TYPE_LABELS[slot]}
                  </h3>
                  {slotMeals.map((meal) => (
                    <MealCard key={meal.id} meal={meal} hideMealType from="/progress" />
                  ))}
                </div>
              )
            })
          )}
        </section>
      )}

      {adding && selectedDate && (
        <MealForm
          defaultDate={selectedDate}
          defaultMealType={defaultMealType}
          onSave={handleSave}
          onCancel={closeForm}
        />
      )}
    </div>
  )
}
