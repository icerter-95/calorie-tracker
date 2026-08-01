import { format, parseISO } from 'date-fns'
import { dayCalorieStatus, type DayCalorieStatus } from '../types/settings'
import { formatDayHeading, getWeekRange, shiftWeek, todayKey } from '../lib/dates'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const

const DOT_CLASS: Record<Exclude<DayCalorieStatus, 'none'>, string> = {
  'on-target': 'bg-emerald-500',
  'in-range': 'bg-amber-400',
  over: 'bg-red-500',
}

interface WeekCalendarProps {
  selectedDate: string
  onSelectDate: (dateKey: string) => void
  /** Total calories per date key for the visible week (and any loaded days). */
  caloriesByDate: Record<string, number>
  /** Whether any meal entry exists for that date. */
  hasEntriesByDate: Record<string, boolean>
  calorieGoalLower: number
  calorieGoalUpper: number
}

export default function WeekCalendar({
  selectedDate,
  onSelectDate,
  caloriesByDate,
  hasEntriesByDate,
  calorieGoalLower,
  calorieGoalUpper,
}: WeekCalendarProps) {
  const weekDays = getWeekRange(selectedDate)
  const heading = formatDayHeading(selectedDate)
  const isCurrentWeek = getWeekRange(todayKey())[0] === weekDays[0]

  function goWeek(delta: number) {
    const next = shiftWeek(selectedDate, delta)
    // Keep the same weekday when flipping weeks.
    onSelectDate(next)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {heading}
        </h2>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => goWeek(-1)}
            aria-label="Previous week"
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            ‹
          </button>
          {!isCurrentWeek && (
            <button
              type="button"
              onClick={() => onSelectDate(todayKey())}
              className="rounded-full px-2.5 py-1 text-xs font-medium text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-stone-800"
            >
              This week
            </button>
          )}
          <button
            type="button"
            onClick={() => goWeek(1)}
            aria-label="Next week"
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {weekDays.map((dateKey, index) => {
          const date = parseISO(dateKey)
          const selected = dateKey === selectedDate
          const isToday = dateKey === todayKey()
          const status = dayCalorieStatus(
            caloriesByDate[dateKey] ?? 0,
            Boolean(hasEntriesByDate[dateKey]),
            calorieGoalLower,
            calorieGoalUpper,
          )

          return (
            <button
              key={dateKey}
              type="button"
              onClick={() => onSelectDate(dateKey)}
              className="flex flex-col items-center gap-1 rounded-xl py-1.5 transition-colors hover:bg-stone-200/60 dark:hover:bg-stone-800/80"
              aria-label={format(date, 'EEEE d MMMM')}
              aria-current={selected ? 'date' : undefined}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center text-xs font-medium ${
                  selected
                    ? 'rounded-full bg-teal-700 text-white'
                    : 'text-stone-500 dark:text-stone-400'
                }`}
              >
                {DAY_LETTERS[index]}
              </span>
              <span
                className={`text-sm font-semibold tabular-nums ${
                  selected || isToday
                    ? 'text-teal-700 dark:text-teal-400'
                    : 'text-stone-800 dark:text-stone-100'
                }`}
              >
                {format(date, 'd')}
              </span>
              <span className="flex h-1.5 w-1.5 items-center justify-center">
                {status !== 'none' && (
                  <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[status]}`} />
                )}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
