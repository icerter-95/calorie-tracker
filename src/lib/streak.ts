/**
 * Logging streak: consecutive days with at least one meal. Hitting calorie
 * targets does not count — only that something was logged.
 */
import { shiftDateKey, todayKey } from './dates'

/**
 * Count back from today. If today is still empty, yesterday can keep the
 * streak alive until the day ends.
 */
export function currentLoggingStreak(
  loggedDates: Iterable<string>,
  today: string = todayKey(),
): number {
  const logged = loggedDates instanceof Set ? loggedDates : new Set(loggedDates)
  let cursor = today
  if (!logged.has(cursor)) {
    cursor = shiftDateKey(today, -1)
    if (!logged.has(cursor)) return 0
  }

  let count = 0
  while (logged.has(cursor)) {
    count += 1
    cursor = shiftDateKey(cursor, -1)
  }
  return count
}
