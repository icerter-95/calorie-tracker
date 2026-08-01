import type { MealEntry, MealItem, MealType, WeightEntry } from '../types'

export type MealRow = {
  id: string
  user_id: string
  date: string
  meal_type: string
  description: string | null
  photo_url: string | null
  items: MealItem[] | null
  ingredients: string[] | null
  total_calories: number
  protein_g: number | string
  carbs_g: number | string
  fat_g: number | string
  note: string | null
  created_at: string
}

export type WeightRow = {
  id: string
  user_id: string
  date: string
  weight_kg: number | string
  note: string | null
  created_at: string
}

function num(value: number | string | null | undefined): number {
  return Number(value) || 0
}

export function mapMealRow(row: MealRow): MealEntry {
  return {
    id: row.id,
    date: row.date,
    mealType: row.meal_type as MealType,
    description: row.description ?? undefined,
    photoUrl: row.photo_url ?? undefined,
    items: Array.isArray(row.items) ? row.items : [],
    ingredients: Array.isArray(row.ingredients) ? row.ingredients : [],
    totalCalories: num(row.total_calories),
    proteinG: num(row.protein_g),
    carbsG: num(row.carbs_g),
    fatG: num(row.fat_g),
    note: row.note ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  }
}

export function mapWeightRow(row: WeightRow): WeightEntry {
  return {
    id: row.id,
    date: row.date,
    weightKg: num(row.weight_kg),
    note: row.note ?? undefined,
    createdAt: new Date(row.created_at).getTime(),
  }
}
