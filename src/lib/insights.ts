import type { MealEntry, MealType } from '../types'
import { MEAL_TYPE_ORDER } from '../types'
import { normalizeIngredientTag } from './ingredients'
import { sumCaloriesForDate } from './dates'

const MAIN_SLOTS: MealType[] = ['breakfast', 'lunch', 'dinner']

export type SlotSkipStats = Record<MealType, { skipped: number; logged: number }>

/** Days in range that have at least one meal logged (active tracking days). */
export function activeDatesInRange(meals: MealEntry[], dateKeys: string[]): string[] {
  const logged = new Set(meals.map((m) => m.date))
  return dateKeys.filter((d) => logged.has(d))
}

export function countSkippedSlots(
  meals: MealEntry[],
  dateKeys: string[],
): SlotSkipStats {
  const active = activeDatesInRange(meals, dateKeys)
  const byDate = new Map<string, Set<MealType>>()
  for (const meal of meals) {
    if (!dateKeys.includes(meal.date)) continue
    let set = byDate.get(meal.date)
    if (!set) {
      set = new Set()
      byDate.set(meal.date, set)
    }
    set.add(meal.mealType)
  }

  const stats = Object.fromEntries(
    MEAL_TYPE_ORDER.map((slot) => [slot, { skipped: 0, logged: 0 }]),
  ) as SlotSkipStats

  for (const date of active) {
    const slots = byDate.get(date) ?? new Set()
    for (const slot of MAIN_SLOTS) {
      if (slots.has(slot)) stats[slot].logged += 1
      else stats[slot].skipped += 1
    }
    if (slots.has('snack')) stats.snack.logged += 1
  }

  return stats
}

/** Average calories per day for a slot (sums multiple entries on the same day). */
export function averageCaloriesForSlot(
  meals: MealEntry[],
  dateKeys: string[],
  slot: MealType,
): { average: number; entryCount: number; dayCount: number } {
  const dateSet = new Set(dateKeys)
  const slotMeals = meals.filter((m) => dateSet.has(m.date) && m.mealType === slot)
  const entryCount = slotMeals.length
  if (entryCount === 0) return { average: 0, entryCount: 0, dayCount: 0 }

  const byDay = new Map<string, number>()
  for (const meal of slotMeals) {
    byDay.set(meal.date, (byDay.get(meal.date) ?? 0) + meal.totalCalories)
  }
  const dayTotals = [...byDay.values()]
  const average = Math.round(dayTotals.reduce((a, b) => a + b, 0) / dayTotals.length)
  return { average, entryCount, dayCount: dayTotals.length }
}

export function daysWithIngredient(
  meals: MealEntry[],
  dateKeys: string[],
  query: string,
): { days: string[]; mealCount: number } {
  const tag = normalizeIngredientTag(query)
  if (!tag) return { days: [], mealCount: 0 }

  const dateSet = new Set(dateKeys)
  const matchedDates = new Set<string>()
  let mealCount = 0

  for (const meal of meals) {
    if (!dateSet.has(meal.date)) continue
    const hit = meal.ingredients.some((ing) => {
      const n = normalizeIngredientTag(ing)
      return n === tag || (n != null && (n.includes(tag) || tag.includes(n)))
    })
    if (hit) {
      mealCount += 1
      matchedDates.add(meal.date)
    }
  }

  return {
    days: [...matchedDates].sort(),
    mealCount,
  }
}

export function extremeCalorieDays(
  meals: MealEntry[],
  dateKeys: string[],
): {
  largest: { date: string; totalCalories: number } | null
  smallest: { date: string; totalCalories: number } | null
} {
  const active = activeDatesInRange(meals, dateKeys)
  if (active.length === 0) return { largest: null, smallest: null }

  let largest: { date: string; totalCalories: number } | null = null
  let smallest: { date: string; totalCalories: number } | null = null

  for (const date of active) {
    const total = sumCaloriesForDate(meals, date)
    if (!largest || total > largest.totalCalories) largest = { date, totalCalories: total }
    if (!smallest || total < smallest.totalCalories) smallest = { date, totalCalories: total }
  }

  return { largest, smallest }
}

export function topIngredients(
  meals: MealEntry[],
  dateKeys: string[],
  limit = 8,
): { tag: string; days: number }[] {
  const dateSet = new Set(dateKeys)
  const tagDays = new Map<string, Set<string>>()

  for (const meal of meals) {
    if (!dateSet.has(meal.date)) continue
    for (const raw of meal.ingredients) {
      const tag = normalizeIngredientTag(raw)
      if (!tag) continue
      let set = tagDays.get(tag)
      if (!set) {
        set = new Set()
        tagDays.set(tag, set)
      }
      set.add(meal.date)
    }
  }

  return [...tagDays.entries()]
    .map(([tag, days]) => ({ tag, days: days.size }))
    .sort((a, b) => b.days - a.days || a.tag.localeCompare(b.tag))
    .slice(0, limit)
}
