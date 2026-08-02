import { useCallback, useEffect, useMemo, useState } from 'react'
import CalorieChart from '../components/CalorieChart'
import MealCard from '../components/MealCard'
import MealForm from '../components/MealForm'
import PeriodStats from '../components/PeriodStats'
import StepsSnapshot from '../components/StepsSnapshot'
import { addMeal, deleteMeal, updateMeal } from '../db'
import { useAllMeals, useAllSteps, useAllWeights } from '../hooks/useData'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import {
  buildDailySummaries,
  defaultCustomRange,
  formatDisplayDate,
  formatShortDate,
  getCustomRange,
  getMonthRange,
  getWeekRange,
  sumCaloriesForDate,
  todayKey,
} from '../lib/dates'
import { defaultMealTypeForNow } from '../lib/mealTypeDefaults'
import type { MealEntry, MealInput, MealType } from '../types'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../types'

type Range = 'week' | 'month' | 'custom'

const RANGE_LABELS: Record<Range, string> = {
  week: 'This week',
  month: 'This month',
  custom: 'Custom',
}

export default function HistoryPage() {
  const initialCustom = defaultCustomRange()
  const [range, setRange] = useState<Range>('week')
  const [customStart, setCustomStart] = useState(initialCustom.start)
  const [customEnd, setCustomEnd] = useState(initialCustom.end)
  const [showWeight, setShowWeight] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null)
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

  const dateKeys = useMemo(() => {
    if (range === 'week') return getWeekRange()
    if (range === 'month') return getMonthRange()
    return getCustomRange(customStart, customEnd)
  }, [range, customStart, customEnd])

  useEffect(() => {
    setSelectedDate(null)
    setAdding(false)
    setEditingMeal(null)
  }, [range, customStart, customEnd])

  useEffect(() => {
    setAdding(false)
    setEditingMeal(null)
  }, [selectedDate])

  function closeForm() {
    setAdding(false)
    setEditingMeal(null)
  }

  const summaries = useMemo(
    () => buildDailySummaries(meals ?? [], dateKeys),
    [meals, dateKeys],
  )

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

  const selectedDaySteps = useMemo(() => {
    if (!selectedDate || steps === undefined) return undefined
    return steps.find((s) => s.date === selectedDate) ?? null
  }, [steps, selectedDate])

  const chartHeight = dateKeys.length > 20 ? 320 : 280

  async function handleSave(data: MealInput) {
    setActionError(null)
    try {
      if (editingMeal) {
        await updateMeal(editingMeal.id, data)
      } else {
        await addMeal(data)
      }
      closeForm()
      reloadMeals()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save meal')
    }
  }

  function startAdd(slot?: MealType) {
    setEditingMeal(null)
    setDefaultMealType(slot ?? defaultMealTypeForNow())
    setAdding(true)
  }

  function startEdit(meal: MealEntry) {
    setAdding(false)
    setEditingMeal(meal)
    setDefaultMealType(meal.mealType)
  }

  async function handleDelete(id: string) {
    setActionError(null)
    try {
      if (editingMeal?.id === id) closeForm()
      await deleteMeal(id)
      reloadMeals()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete meal')
    }
  }

  return (
    <div className="space-y-4">
      <section className="space-y-2">
        <div className="flex gap-2">
          {(['week', 'month', 'custom'] as Range[]).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`flex-1 rounded-xl py-2 text-sm font-medium ${
                range === r
                  ? 'bg-teal-700 text-white'
                  : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-700 dark:hover:bg-stone-800'
              }`}
            >
              {RANGE_LABELS[r]}
            </button>
          ))}
        </div>

        {range === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-stone-600 dark:text-stone-300">From</span>
              <input
                type="date"
                value={customStart}
                max={customEnd}
                onChange={(e) => setCustomStart(e.target.value)}
                className="w-full min-w-0 max-w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
              />
            </label>
            <label className="block min-w-0 text-sm">
              <span className="mb-1 block text-stone-600 dark:text-stone-300">To</span>
              <input
                type="date"
                value={customEnd}
                min={customStart}
                onChange={(e) => setCustomEnd(e.target.value)}
                className="w-full min-w-0 max-w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
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

      <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
        <input
          type="checkbox"
          checked={showWeight}
          onChange={(e) => setShowWeight(e.target.checked)}
          className="rounded border-stone-300 text-teal-700 focus:ring-teal-600"
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

      <p className="text-center text-xs text-stone-500 dark:text-stone-400">
        {selectedDate ? 'Selected day — tap another bar to switch' : 'Tap a bar to view meals for that day'}
      </p>

      {(mealsError || weightsError || stepsError || actionError) && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {actionError ?? mealsError ?? weightsError ?? stepsError}
        </p>
      )}

      {selectedDate && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              {formatDisplayDate(selectedDate)}
            </h2>
            <span className="text-sm font-medium text-teal-700 dark:text-teal-400">
              {selectedDayTotal} kcal
            </span>
          </div>

          <StepsSnapshot entry={selectedDaySteps} />

          {adding ? (
            <MealForm
              defaultDate={selectedDate}
              defaultMealType={defaultMealType}
              onSave={handleSave}
              onCancel={closeForm}
            />
          ) : (
            <button
              onClick={() => startAdd()}
              className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-teal-700 shadow-sm ring-1 ring-stone-200 hover:bg-teal-50 dark:bg-stone-900 dark:text-teal-400 dark:ring-stone-700 dark:hover:bg-stone-800"
            >
              + Add entry
            </button>
          )}

          {meals === undefined ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Loading…</p>
          ) : selectedDayMeals.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-sm text-stone-500 ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700">
              No entries on this day. Tap "Add entry" to log one.
            </p>
          ) : (
            MEAL_TYPE_ORDER.map((slot) => {
              const slotMeals = selectedBySlot[slot]
              if (slotMeals.length === 0) return null
              return (
                <div key={slot} className="space-y-2">
                  <h3 className="px-1 text-xs font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    {MEAL_TYPE_LABELS[slot]}
                  </h3>
                  {slotMeals.map((meal) =>
                    editingMeal?.id === meal.id ? (
                      <MealForm
                        key={meal.id}
                        initial={meal}
                        defaultDate={selectedDate}
                        onSave={handleSave}
                        onCancel={closeForm}
                        onDelete={() => handleDelete(meal.id)}
                      />
                    ) : (
                      <MealCard
                        key={meal.id}
                        meal={meal}
                        hideMealType
                        onEdit={() => startEdit(meal)}
                      />
                    ),
                  )}
                </div>
              )
            })
          )}
        </section>
      )}
    </div>
  )
}
