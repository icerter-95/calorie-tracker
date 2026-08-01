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
  totalCalories: number
  proteinG: number
  carbsG: number
  fatG: number
  note?: string
  createdAt: number
}

export interface WeightEntry {
  id: string
  date: string
  weightKg: number
  note?: string
  createdAt: number
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
  totalCalories: number
  proteinG: number
  carbsG: number
  fatG: number
  note?: string
}

export type WeightInput = {
  date: string
  weightKg: number
  note?: string
}
