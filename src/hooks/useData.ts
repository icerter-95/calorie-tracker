import { useCallback, useEffect, useRef, useState } from 'react'
import {
  fetchAllMeals,
  fetchAllSteps,
  fetchAllWeights,
  fetchMealById,
  fetchMealsForDate,
  fetchStepsForDate,
} from '../db'
import { useAuth } from '../auth/AuthProvider'
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

export function useMealsForDate(dateKey: string) {
  const { user } = useAuth()
  const [meals, setMeals] = useState<MealEntry[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)
  const { armReload, resolvePending } = useReloadGate()

  const reload = useCallback(() => armReload(() => setVersion((v) => v + 1)), [armReload])

  useEffect(() => {
    let cancelled = false
    setError(null)

    const load = user ? fetchMealsForDate(dateKey) : Promise.resolve([] as MealEntry[])
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
  }, [user?.id, dateKey, version, resolvePending])

  return { meals, error, reload }
}

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
