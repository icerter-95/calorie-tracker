export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealItem {
  name: string
  calories: number
  proteinG?: number
  carbsG?: number
  fatG?: number
}

export interface MealEntry {
  id: string
  date: string
  mealType: MealType
  description?: string
  photoUrl?: string
  items: MealItem[]
  /** Canonical ingredient tags for search/insights (no calorie split). */
  ingredients: string[]
  totalCalories: number
  proteinG: number
  carbsG: number
  fatG: number
  note?: string
  createdAt: number
}

export type HealthDataSource = 'manual' | 'apple-health'

export interface WeightEntry {
  id: string
  date: string
  weightKg: number
  source: HealthDataSource
  syncedAt?: number
  note?: string
  createdAt: number
}

export interface StepsEntry {
  id: string
  date: string
  steps: number
  source: HealthDataSource
  syncedAt?: number
  createdAt: number
}

export interface HealthSyncTokenInfo {
  tokenPrefix: string
  createdAt: number
  lastUsedAt?: number
}

export interface DailyCalorieSummary {
  date: string
  totalCalories: number
}

export const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: 'Breakfast',
  lunch: 'Lunch',
  dinner: 'Dinner',
  snack: 'Snack',
}

export type MealInput = {
  date: string
  mealType: MealType
  description?: string
  photoUrl?: string
  items: MealItem[]
  ingredients: string[]
  totalCalories: number
  proteinG: number
  carbsG: number
  fatG: number
  note?: string
}

export const MEAL_TYPE_ORDER: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack']

export type WeightInput = {
  date: string
  weightKg: number
  note?: string
}
