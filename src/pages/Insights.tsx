import { useCallback, useMemo, useState } from 'react'
import { useAllMeals } from '../hooks/useData'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import {
  averageCaloriesForSlot,
  countSkippedSlots,
  daysWithIngredient,
  extremeCalorieDays,
  topIngredients,
} from '../lib/insights'
import { formatDisplayDate, getMonthRange, getWeekRange } from '../lib/dates'
import { normalizeIngredientTag } from '../lib/ingredients'
import { MEAL_TYPE_LABELS } from '../types'
import type { MealType } from '../types'

type Range = 'week' | 'month'

const SLOT_AVG: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export default function InsightsPage() {
  const [range, setRange] = useState<Range>('month')
  const [foodQuery, setFoodQuery] = useState('chicken')
  const [searched, setSearched] = useState('chicken')
  const { meals, error, reload } = useAllMeals()

  const pullToRefresh = useCallback(async () => {
    await reload()
  }, [reload])

  useRegisterPullToRefresh(pullToRefresh)

  const dateKeys = useMemo(
    () => (range === 'week' ? getWeekRange() : getMonthRange()),
    [range],
  )

  const skips = useMemo(
    () => countSkippedSlots(meals ?? [], dateKeys),
    [meals, dateKeys],
  )

  const extremes = useMemo(
    () => extremeCalorieDays(meals ?? [], dateKeys),
    [meals, dateKeys],
  )

  const slotAverages = useMemo(() => {
    const list = meals ?? []
    return SLOT_AVG.map((slot) => ({
      slot,
      ...averageCaloriesForSlot(list, dateKeys, slot),
    }))
  }, [meals, dateKeys])

  const foodStats = useMemo(
    () => daysWithIngredient(meals ?? [], dateKeys, searched),
    [meals, dateKeys, searched],
  )

  const tops = useMemo(
    () => topIngredients(meals ?? [], dateKeys, 10),
    [meals, dateKeys],
  )

  const activeDays = useMemo(() => {
    const set = new Set((meals ?? []).filter((m) => dateKeys.includes(m.date)).map((m) => m.date))
    return set.size
  }, [meals, dateKeys])

  const normalizedSearch = normalizeIngredientTag(searched)

  return (
    <div className="space-y-4">
      <section className="flex gap-2">
        {(['week', 'month'] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium capitalize ${
              range === r
                ? 'bg-teal-700 text-white'
                : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-700 dark:hover:bg-stone-800'
            }`}
          >
            This {r}
          </button>
        ))}
      </section>

      <p className="text-xs text-stone-500 dark:text-stone-400">
        Based on {activeDays} day{activeDays === 1 ? '' : 's'} with at least one entry logged.
        Skipped meals only count on those days.
      </p>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error}
        </p>
      )}

      {meals === undefined ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">Loading…</p>
      ) : (
        <>
          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Skipped main meals
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {(['breakfast', 'lunch', 'dinner'] as const).map((slot) => (
                <div
                  key={slot}
                  className="rounded-2xl bg-white p-3 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700"
                >
                  <p className="text-xs text-stone-500 dark:text-stone-400">
                    {MEAL_TYPE_LABELS[slot]}
                  </p>
                  <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
                    {skips[slot].skipped}
                  </p>
                  <p className="text-[11px] text-stone-400 dark:text-stone-500">
                    of {skips[slot].skipped + skips[slot].logged} active days
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Avg calories by slot
            </h2>
            <div className="space-y-2">
              {slotAverages.map(({ slot, average, dayCount, entryCount }) => (
                <div
                  key={slot}
                  className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700"
                >
                  <div>
                    <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
                      {MEAL_TYPE_LABELS[slot]}
                    </p>
                    <p className="text-xs text-stone-400 dark:text-stone-500">
                      {dayCount} day{dayCount === 1 ? '' : 's'} · {entryCount} entr
                      {entryCount === 1 ? 'y' : 'ies'}
                    </p>
                  </div>
                  <p className="text-lg font-semibold text-stone-900 dark:text-stone-50">
                    {dayCount ? `${average}` : '—'}
                    {dayCount > 0 && (
                      <span className="ml-1 text-xs font-normal text-stone-400">kcal</span>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Calorie extremes
            </h2>
            <div className="grid grid-cols-2 gap-2">
              <ExtremeCard label="Largest day" day={extremes.largest} />
              <ExtremeCard label="Smallest day" day={extremes.smallest} />
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Days with a food
            </h2>
            <div className="rounded-2xl bg-white p-4 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={foodQuery}
                  onChange={(e) => setFoodQuery(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') setSearched(foodQuery)
                  }}
                  placeholder="e.g. chicken"
                  className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
                />
                <button
                  type="button"
                  onClick={() => setSearched(foodQuery)}
                  className="rounded-lg bg-teal-700 px-3 py-2 text-sm font-medium text-white hover:bg-teal-800"
                >
                  Search
                </button>
              </div>
              <p className="mt-3 text-sm text-stone-700 dark:text-stone-200">
                {normalizedSearch ? (
                  <>
                    <strong className="text-stone-900 dark:text-stone-50">
                      {foodStats.days.length}
                    </strong>{' '}
                    day{foodStats.days.length === 1 ? '' : 's'} with{' '}
                    <span className="font-medium">{normalizedSearch}</span>
                    <span className="text-stone-400">
                      {' '}
                      ({foodStats.mealCount} entr
                      {foodStats.mealCount === 1 ? 'y' : 'ies'})
                    </span>
                  </>
                ) : (
                  'Enter a food tag to search.'
                )}
              </p>
              {foodStats.days.length > 0 && (
                <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-xs text-stone-500 dark:text-stone-400">
                  {foodStats.days.map((d) => (
                    <li key={d}>{formatDisplayDate(d)}</li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
              Top ingredients
            </h2>
            {tops.length === 0 ? (
              <p className="rounded-2xl bg-white p-4 text-sm text-stone-500 ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700">
                No ingredient tags yet. Add tags when logging, use Suggest tags, or backfill from
                User settings.
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {tops.map(({ tag, days }) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => {
                      setFoodQuery(tag)
                      setSearched(tag)
                    }}
                    className="rounded-xl bg-white px-3 py-2 text-sm ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:ring-stone-700 dark:hover:bg-stone-800"
                  >
                    <span className="font-medium text-stone-800 dark:text-stone-100">{tag}</span>
                    <span className="ml-1.5 text-xs text-stone-400">{days}d</span>
                  </button>
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  )
}

function ExtremeCard({
  label,
  day,
}: {
  label: string
  day: { date: string; totalCalories: number } | null
}) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
      <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
      {day ? (
        <>
          <p className="text-lg font-semibold text-stone-900 dark:text-stone-50">
            {day.totalCalories}
            <span className="ml-1 text-xs font-normal text-stone-400">kcal</span>
          </p>
          <p className="text-[11px] text-stone-400 dark:text-stone-500">
            {formatDisplayDate(day.date)}
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-stone-400">—</p>
      )}
    </div>
  )
}
