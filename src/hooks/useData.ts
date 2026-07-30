import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../db'

export function useAllMeals() {
  return useLiveQuery(() => db.meals.orderBy('createdAt').reverse().toArray(), [])
}

export function useMealsForDate(dateKey: string) {
  return useLiveQuery(
    () => db.meals.where('date').equals(dateKey).sortBy('createdAt'),
    [dateKey],
  )
}

export function useAllWeights() {
  return useLiveQuery(() => db.weights.orderBy('date').toArray(), [])
}
