import { format, parseISO } from 'date-fns'
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TransitionEvent as ReactTransitionEvent,
} from 'react'
import { dayCalorieStatus, type DayCalorieStatus } from '../types/settings'
import { formatDayHeading, getWeekRange, shiftWeek, todayKey } from '../lib/dates'

const DAY_LETTERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const
const SWIPE_THRESHOLD = 0.22
const SNAP_MS = 220

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
  suppressClicks,
}: {
  weekDays: string[]
  selectedDate: string
  onSelectDate: (dateKey: string) => void
  caloriesByDate: Record<string, number>
  hasEntriesByDate: Record<string, boolean>
  calorieGoalLower: number
  calorieGoalUpper: number
  suppressClicks: boolean
}) {
  return (
    <div className="grid w-full shrink-0 grid-cols-7 gap-1">
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
            onClick={() => {
              if (!suppressClicks) onSelectDate(dateKey)
            }}
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
  const viewportRef = useRef<HTMLDivElement>(null)
  const offsetRef = useRef(0)
  const draggingRef = useRef(false)
  const startXRef = useRef(0)
  const startYRef = useRef(0)
  const axisLockRef = useRef<'x' | 'y' | null>(null)
  const pendingDeltaRef = useRef(0)
  const widthRef = useRef(0)
  const snapTimerRef = useRef(0)
  const settlingSnapRef = useRef(false)

  const [offsetPx, setOffsetPx] = useState(0)
  const [snapping, setSnapping] = useState(false)
  const [suppressClicks, setSuppressClicks] = useState(false)

  const heading = formatDayHeading(selectedDate)
  const today = todayKey()
  const showTodayButton = selectedDate !== today

  const weeks = [
    getWeekRange(shiftWeek(selectedDate, -1)),
    getWeekRange(selectedDate),
    getWeekRange(shiftWeek(selectedDate, 1)),
  ]

  function measureWidth() {
    widthRef.current = viewportRef.current?.clientWidth ?? 0
    return widthRef.current
  }

  function setOffset(next: number, withSnap: boolean) {
    offsetRef.current = next
    setOffsetPx(next)
    setSnapping(withSnap)
  }

  function goWeek(delta: number) {
    onSelectDate(shiftWeek(selectedDate, delta))
  }

  function settleAfterSnap() {
    window.clearTimeout(snapTimerRef.current)
    if (!settlingSnapRef.current) return
    settlingSnapRef.current = false
    const delta = pendingDeltaRef.current
    pendingDeltaRef.current = 0
    setSnapping(false)
    // Jump the track back under the new week with no transition (avoids bounce).
    offsetRef.current = 0
    setOffsetPx(0)
    if (delta !== 0) {
      onSelectDate(shiftWeek(selectedDate, delta))
    }
  }

  function finishSwipe(delta: -1 | 0 | 1) {
    const width = measureWidth() || 1
    window.clearTimeout(snapTimerRef.current)

    if (delta === 0) {
      pendingDeltaRef.current = 0
      if (Math.abs(offsetRef.current) < 1) {
        settlingSnapRef.current = false
        setOffset(0, false)
        return
      }
      settlingSnapRef.current = true
      setOffset(0, true)
      snapTimerRef.current = window.setTimeout(settleAfterSnap, SNAP_MS + 40)
      return
    }

    pendingDeltaRef.current = delta
    settlingSnapRef.current = true
    setOffset(-delta * width, true)
    snapTimerRef.current = window.setTimeout(settleAfterSnap, SNAP_MS + 40)
  }

  function handleTransitionEnd(event: ReactTransitionEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget) return
    if (event.propertyName && event.propertyName !== 'transform') return
    settleAfterSnap()
  }

  useEffect(() => {
    return () => window.clearTimeout(snapTimerRef.current)
  }, [])

  useEffect(() => {
    // Keep track centered when date changes via arrows / Today / day tap.
    if (!draggingRef.current && pendingDeltaRef.current === 0) {
      offsetRef.current = 0
      setOffsetPx(0)
      setSnapping(false)
    }
  }, [selectedDate])

  useEffect(() => {
    function onResize() {
      measureWidth()
    }
    window.addEventListener('resize', onResize)
    measureWidth()
    return () => window.removeEventListener('resize', onResize)
  }, [])

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (snapping) return
    event.currentTarget.setPointerCapture(event.pointerId)
    draggingRef.current = true
    axisLockRef.current = null
    startXRef.current = event.clientX
    startYRef.current = event.clientY
    measureWidth()
    setSnapping(false)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!draggingRef.current || snapping) return
    const dx = event.clientX - startXRef.current
    const dy = event.clientY - startYRef.current

    if (!axisLockRef.current) {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return
      axisLockRef.current = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (axisLockRef.current === 'y') return

    event.preventDefault()
    if (Math.abs(dx) > 8) setSuppressClicks(true)
    setOffset(dx, false)
  }

  function onPointerUp() {
    if (!draggingRef.current) return
    draggingRef.current = false
    const width = measureWidth() || 1
    const dx = offsetRef.current

    if (axisLockRef.current !== 'x' || Math.abs(dx) < width * SWIPE_THRESHOLD) {
      finishSwipe(0)
    } else {
      finishSwipe(dx > 0 ? -1 : 1)
    }

    axisLockRef.current = null
    window.setTimeout(() => setSuppressClicks(false), 0)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="min-w-0 truncate text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
          {heading}
        </h2>
        <div className="flex shrink-0 items-center gap-1">
          {showTodayButton && (
            <button
              type="button"
              onClick={() => onSelectDate(today)}
              className="mr-1 rounded-full bg-teal-50 px-2.5 py-1 text-xs font-medium text-teal-700 ring-1 ring-teal-200 hover:bg-teal-100 dark:bg-teal-950/40 dark:text-teal-400 dark:ring-teal-900 dark:hover:bg-teal-950/70"
            >
              Today
            </button>
          )}
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
        ref={viewportRef}
        className="overflow-hidden touch-pan-y"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="flex w-[300%] will-change-transform"
          style={{
            transform: `translate3d(calc(-33.3333% + ${offsetPx}px), 0, 0)`,
            transition: snapping ? `transform ${SNAP_MS}ms ease-out` : 'none',
          }}
          onTransitionEnd={handleTransitionEnd}
        >
          {weeks.map((weekDays) => (
            <div key={weekDays[0]} className="w-1/3 shrink-0">
              <WeekStrip
                weekDays={weekDays}
                selectedDate={selectedDate}
                onSelectDate={onSelectDate}
                caloriesByDate={caloriesByDate}
                hasEntriesByDate={hasEntriesByDate}
                calorieGoalLower={calorieGoalLower}
                calorieGoalUpper={calorieGoalUpper}
                suppressClicks={suppressClicks}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
