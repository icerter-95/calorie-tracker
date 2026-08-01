import {
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
} from 'date-fns'

export function todayKey(): string {
  return format(new Date(), 'yyyy-MM-dd')
}

export function toDateKey(date: Date): string {
  return format(date, 'yyyy-MM-dd')
}

export function parseDateKey(dateKey: string): Date {
  return parseISO(dateKey)
}

export function formatDisplayDate(dateKey: string): string {
  return format(parseISO(dateKey), 'EEE, d MMM yyyy')
}

export function formatShortDate(dateKey: string): string {
  return format(parseISO(dateKey), 'd MMM')
}

/** Page heading: "Today" when current day, otherwise e.g. "July 28". */
export function formatDayHeading(dateKey: string): string {
  const date = parseISO(dateKey)
  if (isToday(date)) return 'Today'
  return format(date, 'MMMM d')
}

export function getWeekRange(reference: Date | string = new Date()) {
  const ref = typeof reference === 'string' ? parseISO(reference) : reference
  const start = startOfWeek(ref, { weekStartsOn: 1 })
  const end = endOfWeek(ref, { weekStartsOn: 1 })
  return eachDayOfInterval({ start, end }).map(toDateKey)
}

export function shiftWeek(dateKey: string, weeks: number): string {
  return toDateKey(addWeeks(parseISO(dateKey), weeks))
}

export function isSameDateKey(a: string, b: string): boolean {
  return isSameDay(parseISO(a), parseISO(b))
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
