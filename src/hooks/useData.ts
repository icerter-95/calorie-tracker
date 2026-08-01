import { useCallback, useEffect, useState } from 'react'
import { fetchAllMeals, fetchAllWeights, fetchMealsForDate } from '../db'
import { useAuth } from '../auth/AuthProvider'
import type { MealEntry, WeightEntry } from '../types'

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
