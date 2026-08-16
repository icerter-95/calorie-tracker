/**
 * React Query-style loaders for meals, weights, and steps. Each hook exposes
 * `{ data, error, reload }` and waits for reload() so pull-to-refresh can
 * finish cleanly even if you leave the page mid-fetch.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  fetchAllMeals,
  fetchAllSteps,
  fetchAllWeights,
  fetchCalorieSummariesForRange,
  fetchLoggedDates,
  fetchMealById,
  fetchMealsForDate,
  fetchStepsForDate,
} from '../db'
import { useAuth } from '../auth/AuthProvider'
import {
  mergeCachedSummaries,
  readCachedMealsForDate,
  readCachedSummaries,
  writeCachedMealsForDate,
  type CachedDaySummary,
} from '../lib/diaryCache'
import { getSurroundingWeeksRange } from '../lib/dates'
import type { MealEntry, StepsEntry, WeightEntry } from '../types'

/** Collects reload() promises and resolves them when the matching fetch finishes. */
function useReloadGate() {
  const pendingResolvers = useRef<Array<() => void>>([])

  const armReload = useCallback((bump: () => void) => {
    return new Promise<void>((resolve) => {
      pendingResolvers.current.push(resolve)
      bump()
    })
  }, [])

  const resolvePending = useCallback(() => {
    const resolvers = pendingResolvers.current
    pendingResolvers.current = []
    for (const resolve of resolvers) resolve()
  }, [])

  // If the consumer unmounts mid-reload (e.g. tab change during pull-to-refresh),
  // resolve waiters so the Layout spinner cannot hang forever.
  useEffect(() => () => resolvePending(), [resolvePending])

  return { armReload, resolvePending }
}

/** All meals for the signed-in user (calendar dots, Progress, Insights). */
export function useAllMeals() {
  const { user } = useAuth()
  const [meals, setMeals] = useState<MealEntry[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const { armReload, resolvePending } = useReloadGate()

  const reload = useCallback(() => armReload(() => setVersion((v) => v + 1)), [armReload])

  useEffect(() => {
    let cancelled = false
    setError(null)

    const load = user ? fetchAllMeals() : Promise.resolve([] as MealEntry[])
    load
      .then((result) => {
        if (!cancelled) setMeals(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load meals')
      })
      .finally(() => {
        if (!cancelled) resolvePending()
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, version, resolvePending])

  return { meals, error, reload }
}

/** One meal by id (Meal Detail page). */
export function useMeal(id: string | undefined) {
  const { user } = useAuth()
  const [meal, setMeal] = useState<MealEntry | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const { armReload, resolvePending } = useReloadGate()

  const reload = useCallback(() => armReload(() => setVersion((v) => v + 1)), [armReload])

  useEffect(() => {
    let cancelled = false
    setError(null)

    if (!id || !user) {
      setMeal(null)
      resolvePending()
      return () => {
        cancelled = true
      }
    }

    setMeal(undefined)
    fetchMealById(id)
      .then((result) => {
        if (!cancelled) setMeal(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setMeal(null)
          setError(err instanceof Error ? err.message : 'Failed to load meal')
        }
      })
      .finally(() => {
        if (!cancelled) resolvePending()
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, id, version, resolvePending])

  return { meal, error, reload }
}

/** Meals for a single yyyy-MM-dd (Diary). Paints cache first, then refreshes. */
export function useMealsForDate(dateKey: string) {
  const { user } = useAuth()
  const userId = user?.id
  const userIdRef = useRef(userId)
  const [meals, setMeals] = useState<MealEntry[] | undefined>(() =>
    userId ? readCachedMealsForDate(userId, dateKey) : undefined,
  )
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const { armReload, resolvePending } = useReloadGate()

  const reload = useCallback(() => armReload(() => setVersion((v) => v + 1)), [armReload])

  useEffect(() => {
    let cancelled = false
    setError(null)

    if (!userId) {
      userIdRef.current = undefined
      setMeals([])
      resolvePending()
      return () => {
        cancelled = true
      }
    }

    const cached = readCachedMealsForDate(userId, dateKey)
    if (cached !== undefined) {
      setMeals(cached)
    } else if (userIdRef.current !== userId) {
      // Different account with no snapshot — don't flash the previous user's meals.
      setMeals(undefined)
    }
    userIdRef.current = userId

    fetchMealsForDate(dateKey)
      .then((result) => {
        if (cancelled) return
        setMeals(result)
        writeCachedMealsForDate(userId, dateKey, result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load meals')
      })
      .finally(() => {
        if (!cancelled) resolvePending()
      })

    return () => {
      cancelled = true
    }
  }, [userId, dateKey, version, resolvePending])

  return { meals, error, reload }
}

/** Lean calorie totals for the visible Diary weeks (prev / current / next). */
export function useWeekCalorieSummaries(selectedDate: string) {
  const { user } = useAuth()
  const userId = user?.id
  const { start, end } = getSurroundingWeeksRange(selectedDate)
  const [summaries, setSummaries] = useState<Record<string, CachedDaySummary>>(() =>
    userId ? readCachedSummaries(userId) : {},
  )
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const { armReload, resolvePending } = useReloadGate()

  const reload = useCallback(() => armReload(() => setVersion((v) => v + 1)), [armReload])

  useEffect(() => {
    let cancelled = false
    setError(null)

    if (!userId) {
      setSummaries({})
      resolvePending()
      return () => {
        cancelled = true
      }
    }

    setSummaries(readCachedSummaries(userId))

    fetchCalorieSummariesForRange(start, end)
      .then((range) => {
        if (cancelled) return
        setSummaries(mergeCachedSummaries(userId, range))
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load week totals')
      })
      .finally(() => {
        if (!cancelled) resolvePending()
      })

    return () => {
      cancelled = true
    }
  }, [userId, start, end, version, resolvePending])

  const { caloriesByDate, hasEntriesByDate } = useMemo(() => {
    const calories: Record<string, number> = {}
    const hasEntries: Record<string, boolean> = {}
    for (const [date, summary] of Object.entries(summaries)) {
      calories[date] = summary.totalCalories
      hasEntries[date] = summary.hasEntries
    }
    return { caloriesByDate: calories, hasEntriesByDate: hasEntries }
  }, [summaries])

  return { caloriesByDate, hasEntriesByDate, error, reload }
}

function loggedDatesFromSummaries(summaries: Record<string, CachedDaySummary>): string[] {
  return Object.entries(summaries)
    .filter(([, summary]) => summary.hasEntries)
    .map(([date]) => date)
}

/** Distinct days with at least one meal. Cache paints first, then a full refresh. */
export function useLoggedDates() {
  const { user } = useAuth()
  const userId = user?.id
  const userIdRef = useRef(userId)
  const [dates, setDates] = useState<string[] | undefined>(() => {
    if (!userId) return undefined
    const fromCache = loggedDatesFromSummaries(readCachedSummaries(userId))
    return fromCache.length > 0 ? fromCache : undefined
  })
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const { armReload, resolvePending } = useReloadGate()

  const reload = useCallback(() => armReload(() => setVersion((v) => v + 1)), [armReload])

  useEffect(() => {
    let cancelled = false
    setError(null)

    if (!userId) {
      userIdRef.current = undefined
      setDates([])
      resolvePending()
      return () => {
        cancelled = true
      }
    }

    const fromCache = loggedDatesFromSummaries(readCachedSummaries(userId))
    if (fromCache.length > 0) {
      setDates(fromCache)
    } else if (userIdRef.current !== userId) {
      setDates(undefined)
    }
    userIdRef.current = userId

    fetchLoggedDates()
      .then((result) => {
        if (!cancelled) setDates(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load streak')
      })
      .finally(() => {
        if (!cancelled) resolvePending()
      })

    return () => {
      cancelled = true
    }
  }, [userId, version, resolvePending])

  return { dates, error, reload }
}

/** All weight logs (Health + Progress overlay). */
export function useAllWeights() {
  const { user } = useAuth()
  const [weights, setWeights] = useState<WeightEntry[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const { armReload, resolvePending } = useReloadGate()

  const reload = useCallback(() => armReload(() => setVersion((v) => v + 1)), [armReload])

  useEffect(() => {
    let cancelled = false
    setError(null)

    const load = user ? fetchAllWeights() : Promise.resolve([] as WeightEntry[])
    load
      .then((result) => {
        if (!cancelled) setWeights(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load weights')
      })
      .finally(() => {
        if (!cancelled) resolvePending()
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, version, resolvePending])

  return { weights, error, reload }
}

/** All step snapshots (Health + Progress averages). */
export function useAllSteps() {
  const { user } = useAuth()
  const [steps, setSteps] = useState<StepsEntry[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const { armReload, resolvePending } = useReloadGate()

  const reload = useCallback(() => armReload(() => setVersion((v) => v + 1)), [armReload])

  useEffect(() => {
    let cancelled = false
    setError(null)

    const load = user ? fetchAllSteps() : Promise.resolve([] as StepsEntry[])
    load
      .then((result) => {
        if (!cancelled) setSteps(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load steps')
      })
      .finally(() => {
        if (!cancelled) resolvePending()
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, version, resolvePending])

  return { steps, error, reload }
}

/** Steps for one day (unused on Diary currently; kept for snapshots). */
export function useStepsForDate(dateKey: string) {
  const { user } = useAuth()
  const [entry, setEntry] = useState<StepsEntry | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const { armReload, resolvePending } = useReloadGate()

  const reload = useCallback(() => armReload(() => setVersion((v) => v + 1)), [armReload])

  useEffect(() => {
    let cancelled = false
    setError(null)

    const load = user ? fetchStepsForDate(dateKey) : Promise.resolve(null)
    load
      .then((result) => {
        if (!cancelled) setEntry(result)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load steps')
      })
      .finally(() => {
        if (!cancelled) resolvePending()
      })

    return () => {
      cancelled = true
    }
  }, [user?.id, dateKey, version, resolvePending])

  return { entry, error, reload }
}
