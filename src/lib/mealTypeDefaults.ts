import type { MealType } from '../types'

/** Suggest a meal slot from local time of day. */
export function defaultMealTypeForNow(date = new Date()): MealType {
  const hour = date.getHours()
  if (hour < 11) return 'breakfast'
  if (hour < 15) return 'lunch'
  if (hour < 21) return 'dinner'
  return 'snack'
}
