import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, eachDayOfInterval } from 'date-fns'

export function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function formatDisplayDate(dateKey: string): string {
  return format(parseISO(dateKey), 'EEE, d MMM yyyy')
}

export function formatShortDate(dateKey: string): string {
  return format(parseISO(dateKey), 'd MMM')
}

export function getWeekRange(reference = new Date()) {
  const start = startOfWeek(reference, { weekStartsOn: 1 })
  const end = endOfWeek(reference, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end }).map(toDateKey)
}

export function getMonthRange(reference = new Date()) {
  const start = startOfMonth(reference)
  const end = endOfMonth(reference)
  return eachDayOfInterval({ start, end }).map(toDateKey)
}

export function sumCaloriesForDate(
  meals: { date: string; totalCalories: number }[],
  dateKey: string,
): number {
  return meals
    .filter((m) => m.date === dateKey)
    .reduce((sum, m) => sum + m.totalCalories, 0)
}

export function buildDailySummaries(
  meals: { date: string; totalCalories: number }[],
  dateKeys: string[],
) {
  return dateKeys.map((date) => ({
    date,
    totalCalories: sumCaloriesForDate(meals, date),
  }))
}
