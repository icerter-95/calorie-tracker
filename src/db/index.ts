import Dexie, { type EntityTable } from 'dexie'
import type { MealEntry, WeightEntry } from '../types'

const db = new Dexie('CalorieTrackerDB') as Dexie & {
  meals: EntityTable<MealEntry, 'id'>
  weights: EntityTable<WeightEntry, 'id'>
}

db.version(1).stores({
  meals: '++id, date, mealType, createdAt',
  weights: '++id, date, createdAt',
})

export { db }

export async function addMeal(meal: Omit<MealEntry, 'id'>) {
  return db.meals.add(meal)
}

export async function updateMeal(id: number, meal: Omit<MealEntry, 'id'>) {
  return db.meals.update(id, meal)
}

export async function deleteMeal(id: number) {
  return db.meals.delete(id)
}

export async function addWeight(entry: Omit<WeightEntry, 'id'>) {
  return db.weights.add(entry)
}

export async function updateWeight(id: number, entry: Omit<WeightEntry, 'id'>) {
  return db.weights.update(id, entry)
}

export async function deleteWeight(id: number) {
  return db.weights.delete(id)
}
