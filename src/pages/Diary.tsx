/**
 * Diary (home). Pick a day on the week calendar, see totals, and add/edit meals
 * grouped by breakfast / lunch / dinner / snack.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { addMeal, deleteMeal, updateMeal } from '../db'
import DaySummaryCard from '../components/DaySummaryCard'
import MealCard from '../components/MealCard'
import MealForm from '../components/MealForm'
import WeekCalendar from '../components/WeekCalendar'
import { useMealsForDate, useWeekCalorieSummaries } from '../hooks/useData'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import { useSettings } from '../hooks/useSettings'
import { todayKey } from '../lib/dates'
import { defaultMealTypeForNow } from '../lib/mealTypeDefaults'
import type { MealEntry, MealInput, MealType } from '../types'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../types'

type ScrollAnchor =
  | { kind: 'y'; scrollY: number }
  | { kind: 'slot'; slot: MealType; offset: number }

function headerBottom() {
  const header = Number.parseFloat(
    getComputedStyle(document.documentElement).getPropertyValue('--app-header-height'),
  )
  return Number.isFinite(header) ? header : 68
}

export default function DiaryPage() {
  // Selected day + meals for that day; week summaries feed the calendar dots.
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const { meals, error, reload } = useMealsForDate(selectedDate)
  const {
    caloriesByDate,
    hasEntriesByDate,
    reload: reloadWeek,
  } = useWeekCalorieSummaries(selectedDate)
  const { settings } = useSettings()

  function reloadDayAndWeek() {
    void reload()
    void reloadWeek()
  }

  const pullToRefresh = useCallback(async () => {
    await Promise.all([reload(), reloadWeek()])
  }, [reload, reloadWeek])

  useRegisterPullToRefresh(pullToRefresh)
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null)
  const [adding, setAdding] = useState(false)
  const [defaultMealType, setDefaultMealType] = useState<MealType>(defaultMealTypeForNow)
  const [actionError, setActionError] = useState<string | null>(null)

  const sectionRefs = useRef<Partial<Record<MealType, HTMLElement | null>>>({})
  const pendingScrollAnchor = useRef<ScrollAnchor | null>(null)
  const pendingScrollDate = useRef<string | null>(null)
  const mealsAtSelectRef = useRef<MealEntry[] | undefined>(undefined)

  // Day totals for the summary card; calendar dots come from the week query.
  const totalCalories = (meals ?? []).reduce((sum, m) => sum + m.totalCalories, 0)
  const totalProtein = (meals ?? []).reduce((sum, m) => sum + m.proteinG, 0)
  const totalCarbs = (meals ?? []).reduce((sum, m) => sum + m.carbsG, 0)
  const totalFat = (meals ?? []).reduce((sum, m) => sum + m.fatG, 0)

  const bySlot = useMemo(() => {
    const map = Object.fromEntries(MEAL_TYPE_ORDER.map((t) => [t, [] as MealEntry[]])) as Record<
      MealType,
      MealEntry[]
    >
    for (const meal of meals ?? []) {
      map[meal.mealType].push(meal)
    }
    return map
  }, [meals])

  // Keep the same meal slot in view when switching days (avoids a jump to the top).
  function captureScrollAnchor(): ScrollAnchor {
    const anchorY = headerBottom()
    const first = sectionRefs.current[MEAL_TYPE_ORDER[0]]
    if (!first || first.getBoundingClientRect().top > anchorY + 24) {
      return { kind: 'y', scrollY: window.scrollY }
    }

    let activeSlot = MEAL_TYPE_ORDER[0]
    for (const slot of MEAL_TYPE_ORDER) {
      const el = sectionRefs.current[slot]
      if (!el) continue
      if (el.getBoundingClientRect().top <= anchorY + 12) activeSlot = slot
    }

    const activeEl = sectionRefs.current[activeSlot]
    if (!activeEl) return { kind: 'y', scrollY: window.scrollY }

    return {
      kind: 'slot',
      slot: activeSlot,
      offset: activeEl.getBoundingClientRect().top - anchorY,
    }
  }

  function restoreScrollAnchor(anchor: ScrollAnchor) {
    if (anchor.kind === 'y') {
      window.scrollTo({ top: anchor.scrollY })
      return
    }

    const el = sectionRefs.current[anchor.slot]
    if (!el) return
    const anchorY = headerBottom()
    const delta = el.getBoundingClientRect().top - anchorY - anchor.offset
    if (Math.abs(delta) > 1) window.scrollBy(0, delta)
  }

  useLayoutEffect(() => {
    if (pendingScrollDate.current !== selectedDate) return
    if (meals === undefined) return
    const anchor = pendingScrollAnchor.current
    if (!anchor) return

    const mealsStillStale =
      meals === mealsAtSelectRef.current ||
      (meals.length > 0 && meals.some((meal) => meal.date !== selectedDate))

    restoreScrollAnchor(anchor)
    if (mealsStillStale) return

    requestAnimationFrame(() => restoreScrollAnchor(anchor))
    pendingScrollAnchor.current = null
    pendingScrollDate.current = null
  }, [selectedDate, meals])

  function selectDate(dateKey: string) {
    if (dateKey === selectedDate) return
    pendingScrollAnchor.current = captureScrollAnchor()
    pendingScrollDate.current = dateKey
    mealsAtSelectRef.current = meals
    setSelectedDate(dateKey)
    setEditingMeal(null)
    setAdding(false)
    setActionError(null)
  }

  function closeForm() {
    setEditingMeal(null)
    setAdding(false)
  }

  // Add / edit / delete meals for the selected day.
  async function handleSave(data: MealInput) {
    setActionError(null)
    try {
      if (editingMeal) {
        await updateMeal(editingMeal.id, data)
      } else {
        await addMeal(data)
      }
      closeForm()
      reloadDayAndWeek()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save meal')
    }
  }

  function startAdd() {
    setEditingMeal(null)
    setDefaultMealType(defaultMealTypeForNow())
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
      reloadDayAndWeek()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete meal')
    }
  }

  return (
    <div className="space-y-4">
      {/* Week strip + calorie/macro summary for the selected day */}
      <WeekCalendar
        selectedDate={selectedDate}
        onSelectDate={selectDate}
        caloriesByDate={caloriesByDate}
        hasEntriesByDate={hasEntriesByDate}
        calorieGoalLower={settings.calorieGoalLower}
        calorieGoalUpper={settings.calorieGoalUpper}
      />

      <DaySummaryCard
        totalCalories={totalCalories}
        totalProtein={totalProtein}
        totalCarbs={totalCarbs}
        totalFat={totalFat}
        calorieGoalLower={settings.calorieGoalLower}
        calorieGoalUpper={settings.calorieGoalUpper}
        proteinGoal={settings.proteinGoal}
        carbsGoal={settings.carbsGoal}
        fatGoal={settings.fatGoal}
      />

      {adding ? (
        <MealForm
          defaultDate={selectedDate}
          defaultMealType={defaultMealType}
          onSave={handleSave}
          onCancel={closeForm}
        />
      ) : (
        <button
          type="button"
          onClick={startAdd}
          className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-teal-700 shadow-sm ring-1 ring-stone-200 hover:bg-teal-50 dark:bg-stone-900 dark:text-teal-400 dark:ring-stone-700 dark:hover:bg-stone-800"
        >
          + Add meal
        </button>
      )}

      {(error || actionError) && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {actionError ?? error}
        </p>
      )}

      {/* Meals grouped by breakfast / lunch / dinner / snack */}
      {meals === undefined ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          {MEAL_TYPE_ORDER.map((slot) => {
            const slotMeals = bySlot[slot]
            if (slotMeals.length === 0) return null

            const slotKcal = slotMeals.reduce((s, m) => s + m.totalCalories, 0)

            return (
              <section
                key={slot}
                ref={(node) => {
                  sectionRefs.current[slot] = node
                }}
                className="space-y-2"
              >
                <div className="flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    {MEAL_TYPE_LABELS[slot]}
                  </h2>
                  <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                    {slotKcal} kcal
                  </span>
                </div>

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
                      from="/"
                      onEdit={() => startEdit(meal)}
                    />
                  ),
                )}
              </section>
            )
          })}

          {(meals?.length ?? 0) === 0 && !adding && (
            <p className="rounded-2xl bg-white p-4 text-center text-sm text-stone-500 ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700">
              No meals yet. Tap “Add meal” to log one.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
