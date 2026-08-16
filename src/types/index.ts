/**
 * Shared data shapes used across the app (meals, weight, steps, health sync).
 * These are the in-app types — database rows are mapped in src/db/mappers.ts.
 */

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealItem {
  name: string
  calories: number
  proteinG?: number
  carbsG?: number
  fatG?: number
}

// One logged meal as the UI sees it (camelCase, dates as timestamps).
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

// Weight / steps can be typed by hand or synced from Apple Health.
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

// Public info about the Apple Health Shortcut token (never the full secret).
export interface HealthSyncTokenInfo {
  tokenPrefix: string
  createdAt: number
  lastUsedAt?: number
}

export interface DailyCalorieSummary {
  date: string
  totalCalories: number
}

// Labels, slot order, and payloads used when creating/updating meals or weight.
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

/** Main meals used for the Diary logging checklist (snack is optional). */
export const MAIN_MEAL_SLOTS = ['breakfast', 'lunch', 'dinner'] as const
export type MainMealSlot = (typeof MAIN_MEAL_SLOTS)[number]

export type WeightInput = {
  date: string
  weightKg: number
  note?: string
}
