/**
 * Diary (home). Pick a day on the week calendar, see totals, and review meals
 * grouped by breakfast / lunch / dinner / snack. Adding food uses Camera / Input.
 */
import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import AddMealFlow, { type AddMealFlowHandle } from '../components/AddMealFlow'
import DaySummaryCard from '../components/DaySummaryCard'
import DiaryLoggingBar from '../components/DiaryLoggingBar'
import MealCard from '../components/MealCard'
import WeekCalendar from '../components/WeekCalendar'
import { useLoggedDates, useMealsForDate, useWeekCalorieSummaries } from '../hooks/useData'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import { useSettings } from '../hooks/useSettings'
import { todayKey } from '../lib/dates'
import { currentLoggingStreak } from '../lib/streak'
import type { MainMealSlot, MealEntry, MealType } from '../types'
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
  const { dates: loggedDates, reload: reloadLoggedDates } = useLoggedDates()
  const { settings } = useSettings()

  function reloadDayAndWeek() {
    void reload()
    void reloadWeek()
    void reloadLoggedDates()
  }

  const pullToRefresh = useCallback(async () => {
    await Promise.all([reload(), reloadWeek(), reloadLoggedDates()])
  }, [reload, reloadWeek, reloadLoggedDates])

  useRegisterPullToRefresh(pullToRefresh)
  const addMealRef = useRef<AddMealFlowHandle>(null)
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

  const loggedSlots = useMemo(
    (): Record<MainMealSlot, boolean> => ({
      breakfast: bySlot.breakfast.length > 0,
      lunch: bySlot.lunch.length > 0,
      dinner: bySlot.dinner.length > 0,
    }),
    [bySlot],
  )

  const loggedDateSet = useMemo(() => {
    const set = new Set(loggedDates ?? [])
    if (loggedDates === undefined) {
      for (const [date, has] of Object.entries(hasEntriesByDate)) {
        if (has) set.add(date)
      }
    }
    if (
      meals !== undefined &&
      meals.length > 0 &&
      meals.every((meal) => meal.date === selectedDate)
    ) {
      set.add(selectedDate)
    }
    return set
  }, [hasEntriesByDate, loggedDates, meals, selectedDate])

  const streakReady =
    loggedDates !== undefined || Object.keys(hasEntriesByDate).length > 0
  const streak = streakReady ? currentLoggingStreak(loggedDateSet) : null

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
    setActionError(null)
  }

  function focusSlot(slot: MealType) {
    if (bySlot[slot].length > 0) {
      const el = sectionRefs.current[slot]
      if (!el) return
      const y = el.getBoundingClientRect().top + window.scrollY - headerBottom() - 8
      window.scrollTo({ top: y, behavior: 'smooth' })
      return
    }
    addMealRef.current?.openCamera(slot)
  }

  return (
    <div className="space-y-3 pb-28">
      <div className="space-y-1.5">
        <WeekCalendar
          selectedDate={selectedDate}
          onSelectDate={selectDate}
          caloriesByDate={caloriesByDate}
          hasEntriesByDate={hasEntriesByDate}
          calorieGoalLower={settings.calorieGoalLower}
          calorieGoalUpper={settings.calorieGoalUpper}
        />
        <DiaryLoggingBar
          streak={streak}
          loggedSlots={loggedSlots}
          onSelectSlot={focusSlot}
        />
      </div>

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
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-strong">
          {actionError ?? error}
        </p>
      )}

      {/* Meals grouped by breakfast / lunch / dinner / snack */}
      {meals === undefined ? (
        <p className="text-sm text-content-subtle">Loading…</p>
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
              >
                <div className="flex items-baseline justify-between">
                  <h2 className="text-[10px] font-medium uppercase tracking-widest text-content-muted">
                    {MEAL_TYPE_LABELS[slot]}
                  </h2>
                  <span className="text-xs tabular-nums text-content-faint">
                    {slotKcal} kcal
                  </span>
                </div>

                <div className="divide-y divide-line">
                  {slotMeals.map((meal) => (
                    <MealCard key={meal.id} meal={meal} hideMealType from="/" />
                  ))}
                </div>
              </section>
            )
          })}
        </div>
      )}

      <AddMealFlow ref={addMealRef} date={selectedDate} onSaved={reloadDayAndWeek} />
    </div>
  )
}
