import { useCallback, useEffect, useState } from 'react'
import {
  fetchAllMeals,
  fetchAllSteps,
  fetchAllWeights,
  fetchMealsForDate,
  fetchStepsForDate,
} from '../db'
import { useAuth } from '../auth/AuthProvider'
import type { MealEntry, StepsEntry, WeightEntry } from '../types'

export function useAllMeals() {
  const { user } = useAuth()
  const [meals, setMeals] = useState<MealEntry[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const reload = useCallback(() => setVersion((v) => v + 1), [])

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

    return () => {
      cancelled = true
    }
  }, [user?.id, version])

  return { meals, error, reload }
}

export function useMealsForDate(dateKey: string) {
  const { user } = useAuth()
  const [meals, setMeals] = useState<MealEntry[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const reload = useCallback(() => setVersion((v) => v + 1), [])

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

    return () => {
      cancelled = true
    }
  }, [user?.id, dateKey, version])

  return { meals, error, reload }
}

export function useAllWeights() {
  const { user } = useAuth()
  const [weights, setWeights] = useState<WeightEntry[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const reload = useCallback(() => setVersion((v) => v + 1), [])

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

    return () => {
      cancelled = true
    }
  }, [user?.id, version])

  return { weights, error, reload }
}

export function useAllSteps() {
  const { user } = useAuth()
  const [steps, setSteps] = useState<StepsEntry[] | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const reload = useCallback(() => setVersion((v) => v + 1), [])

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

    return () => {
      cancelled = true
    }
  }, [user?.id, version])

  return { steps, error, reload }
}

export function useStepsForDate(dateKey: string) {
  const { user } = useAuth()
  const [entry, setEntry] = useState<StepsEntry | null | undefined>(undefined)
  const [error, setError] = useState<string | null>(null)
  const [version, setVersion] = useState(0)

  const reload = useCallback(() => setVersion((v) => v + 1), [])

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

    return () => {
      cancelled = true
    }
  }, [user?.id, dateKey, version])

  return { entry, error, reload }
}
