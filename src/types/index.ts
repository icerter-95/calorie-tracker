export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'

export interface MealItem {
  name: string
  calories: number
}

export interface MealEntry {
  id?: number
  date: string
  mealType: MealType
  items: MealItem[]
  totalCalories: number
  note?: string
  createdAt: number
}

export interface WeightEntry {
  id?: number
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
