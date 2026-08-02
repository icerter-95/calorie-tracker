import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { addMeal, deleteMeal, updateMeal } from '../db'
import DaySummaryCard from '../components/DaySummaryCard'
import MealCard from '../components/MealCard'
import MealForm from '../components/MealForm'
import WeekCalendar from '../components/WeekCalendar'
import { useAllMeals, useMealsForDate } from '../hooks/useData'
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
  const [selectedDate, setSelectedDate] = useState(todayKey)
  const { meals, error, reload } = useMealsForDate(selectedDate)
  const { meals: allMeals, reload: reloadAllMeals } = useAllMeals()
  const { settings } = useSettings()

  function reloadDayAndWeek() {
    reload()
    reloadAllMeals()
  }
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null)
  const [addTarget, setAddTarget] = useState<MealType | null>(null)
  const [defaultMealType, setDefaultMealType] = useState<MealType>(defaultMealTypeForNow)
  const [actionError, setActionError] = useState<string | null>(null)

  const sectionRefs = useRef<Partial<Record<MealType, HTMLElement | null>>>({})
  const pendingScrollAnchor = useRef<ScrollAnchor | null>(null)
  const pendingScrollDate = useRef<string | null>(null)
  const mealsAtSelectRef = useRef<MealEntry[] | undefined>(undefined)

  const totalCalories = (meals ?? []).reduce((sum, m) => sum + m.totalCalories, 0)
  const totalProtein = (meals ?? []).reduce((sum, m) => sum + m.proteinG, 0)
  const totalCarbs = (meals ?? []).reduce((sum, m) => sum + m.carbsG, 0)
  const totalFat = (meals ?? []).reduce((sum, m) => sum + m.fatG, 0)

  const { caloriesByDate, hasEntriesByDate } = useMemo(() => {
    const calories: Record<string, number> = {}
    const hasEntries: Record<string, boolean> = {}
    for (const meal of allMeals ?? []) {
      calories[meal.date] = (calories[meal.date] ?? 0) + meal.totalCalories
      hasEntries[meal.date] = true
    }
    return { caloriesByDate: calories, hasEntriesByDate: hasEntries }
  }, [allMeals])

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

    // Re-apply after paint in case late layout shifted section tops.
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
    setAddTarget(null)
    setActionError(null)
  }

  function closeForm() {
    setEditingMeal(null)
    setAddTarget(null)
  }

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

  function startAdd(slot: MealType) {
    setEditingMeal(null)
    setDefaultMealType(slot)
    setAddTarget(slot)
  }

  function startEdit(meal: MealEntry) {
    setAddTarget(null)
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

  const form = (
    <MealForm
      initial={editingMeal ?? undefined}
      defaultDate={selectedDate}
      defaultMealType={editingMeal ? undefined : defaultMealType}
      onSave={handleSave}
      onCancel={closeForm}
      onDelete={editingMeal ? () => handleDelete(editingMeal.id) : undefined}
    />
  )

  return (
    <div className="space-y-4">
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

      {(error || actionError) && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {actionError ?? error}
        </p>
      )}

      {meals === undefined ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          {MEAL_TYPE_ORDER.map((slot) => {
            const slotMeals = bySlot[slot]
            const slotKcal = slotMeals.reduce((s, m) => s + m.totalCalories, 0)
            const isMain = slot !== 'snack'
            const empty = slotMeals.length === 0
            const addingHere = addTarget === slot

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
                  {!empty && (
                    <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                      {slotKcal} kcal
                    </span>
                  )}
                </div>

                {empty ? (
                  addingHere ? (
                    form
                  ) : (
                    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        {isMain ? 'Not logged' : 'No snacks yet'}
                      </p>
                      <button
                        type="button"
                        onClick={() => startAdd(slot)}
                        className="text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
                      >
                        + Add
                      </button>
                    </div>
                  )
                ) : (
                  <>
                    {slotMeals.map((meal) =>
                      editingMeal?.id === meal.id ? (
                        <div key={meal.id}>{form}</div>
                      ) : (
                        <MealCard
                          key={meal.id}
                          meal={meal}
                          hideMealType
                          onEdit={() => startEdit(meal)}
                        />
                      ),
                    )}
                    {addingHere ? (
                      form
                    ) : (
                      <button
                        type="button"
                        onClick={() => startAdd(slot)}
                        className="w-full rounded-xl py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-stone-900"
                      >
                        + Add {MEAL_TYPE_LABELS[slot].toLowerCase()}
                      </button>
                    )}
                  </>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
