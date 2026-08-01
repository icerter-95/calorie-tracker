import { format, parseISO } from 'date-fns'
import { useEffect, useRef, useState } from 'react'
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

function WeekStrip({
  weekDays,
  selectedDate,
  onSelectDate,
  caloriesByDate,
  hasEntriesByDate,
  calorieGoalLower,
  calorieGoalUpper,
}: {
  weekDays: string[]
  selectedDate: string
  onSelectDate: (dateKey: string) => void
  caloriesByDate: Record<string, number>
  hasEntriesByDate: Record<string, boolean>
  calorieGoalLower: number
  calorieGoalUpper: number
}) {
  return (
    <div className="grid min-w-full shrink-0 snap-center grid-cols-7 gap-1">
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
  )
}

export default function WeekCalendar({
  selectedDate,
  onSelectDate,
  caloriesByDate,
  hasEntriesByDate,
  calorieGoalLower,
  calorieGoalUpper,
}: WeekCalendarProps) {
  const scrollerRef = useRef<HTMLDivElement>(null)
  const settlingRef = useRef(false)
  const [scrollReady, setScrollReady] = useState(false)

  const heading = formatDayHeading(selectedDate)
  const today = todayKey()
  const currentWeekStart = getWeekRange(today)[0]
  const selectedWeekStart = getWeekRange(selectedDate)[0]
  const isCurrentWeek = selectedWeekStart === currentWeekStart

  const weeks = [
    getWeekRange(shiftWeek(selectedDate, -1)),
    getWeekRange(selectedDate),
    getWeekRange(shiftWeek(selectedDate, 1)),
  ]

  function goWeek(delta: number) {
    onSelectDate(shiftWeek(selectedDate, delta))
  }

  function scrollToCenter(behavior: ScrollBehavior = 'auto') {
    const el = scrollerRef.current
    if (!el) return
    el.scrollTo({ left: el.clientWidth, behavior })
  }

  // Keep the pager centered on the middle (selected) week after date changes.
  useEffect(() => {
    settlingRef.current = true
    scrollToCenter('auto')
    setScrollReady(true)
    const id = window.setTimeout(() => {
      settlingRef.current = false
    }, 50)
    return () => window.clearTimeout(id)
  }, [selectedDate])

  useEffect(() => {
    const el = scrollerRef.current
    if (!el) return

    function applyPage(page: number) {
      if (settlingRef.current) return
      if (page <= 0) {
        settlingRef.current = true
        onSelectDate(shiftWeek(selectedDate, -1))
      } else if (page >= 2) {
        settlingRef.current = true
        onSelectDate(shiftWeek(selectedDate, 1))
      } else {
        scrollToCenter('smooth')
      }
    }

    function onScrollEnd() {
      if (!el || settlingRef.current) return
      const width = el.clientWidth || 1
      const page = Math.round(el.scrollLeft / width)
      applyPage(page)
    }

    // Prefer native scrollend; fall back to a short debounce on scroll.
    let debounceId = 0
    function onScroll() {
      if (settlingRef.current) return
      window.clearTimeout(debounceId)
      debounceId = window.setTimeout(onScrollEnd, 80)
    }

    el.addEventListener('scrollend', onScrollEnd)
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      el.removeEventListener('scrollend', onScrollEnd)
      el.removeEventListener('scroll', onScroll)
      window.clearTimeout(debounceId)
    }
  }, [selectedDate, onSelectDate])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <h2 className="truncate text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            {heading}
          </h2>
          {!isCurrentWeek && (
            <button
              type="button"
              onClick={() => onSelectDate(today)}
              className="shrink-0 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-200 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-400 dark:ring-teal-900 dark:hover:bg-teal-950/70"
            >
              Today
            </button>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => goWeek(-1)}
            aria-label="Previous week"
            className="flex h-8 w-8 items-center justify-center rounded-full text-stone-600 hover:bg-stone-200 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            ‹
          </button>
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

      <div
        ref={scrollerRef}
        className={`flex overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${
          scrollReady ? 'snap-x snap-mandatory' : ''
        }`}
        style={{ WebkitOverflowScrolling: 'touch' }}
      >
        {weeks.map((weekDays, index) => (
          <WeekStrip
            key={`${weekDays[0]}-${index}`}
            weekDays={weekDays}
            selectedDate={selectedDate}
            onSelectDate={onSelectDate}
            caloriesByDate={caloriesByDate}
            hasEntriesByDate={hasEntriesByDate}
            calorieGoalLower={calorieGoalLower}
            calorieGoalUpper={calorieGoalUpper}
          />
        ))}
      </div>
    </div>
  )
}
