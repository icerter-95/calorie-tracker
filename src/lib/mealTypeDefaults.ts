/**
 * Suggest breakfast / lunch / dinner / snack from the current local time.
 *
 * Schedule (local):
 * - Breakfast: 5:00 AM – 12:00 PM
 * - Lunch: 12:00 PM – 5:00 PM
 * - Dinner: 8:00 PM – 10:30 PM
 * - Snack: everything else
 */
import type { MealType } from '../types'

const MINUTES_5AM = 5 * 60
const MINUTES_12PM = 12 * 60
const MINUTES_5PM = 17 * 60
const MINUTES_8PM = 20 * 60
const MINUTES_1030PM = 22 * 60 + 30

/** Suggest a meal slot from local time of day. */
export function defaultMealTypeForNow(date = new Date()): MealType {
  const minutes = date.getHours() * 60 + date.getMinutes()

  if (minutes >= MINUTES_5AM && minutes < MINUTES_12PM) return 'breakfast'
  if (minutes >= MINUTES_12PM && minutes < MINUTES_5PM) return 'lunch'
  if (minutes >= MINUTES_8PM && minutes <= MINUTES_1030PM) return 'dinner'
  return 'snack'
}
