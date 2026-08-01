export type ThemePreference = 'light' | 'dark' | 'system'

export type HealthConnectionId = 'apple-health' | 'google-fit'

export interface HealthConnection {
  id: HealthConnectionId
  connected: boolean
  lastSyncAt?: number
}

export interface AppSettings {
  theme: ThemePreference
  /** Intended daily calories for weight loss (lower milestone). */
  calorieGoalLower: number
  /** Upper daily calorie limit for maintenance (higher milestone). */
  calorieGoalUpper: number
  proteinGoal: number
  carbsGoal: number
  fatGoal: number
  healthConnections: Record<HealthConnectionId, HealthConnection>
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  calorieGoalLower: 2000,
  calorieGoalUpper: 2450,
  proteinGoal: 150,
  carbsGoal: 220,
  fatGoal: 65,
  healthConnections: {
    'apple-health': { id: 'apple-health', connected: false },
    'google-fit': { id: 'google-fit', connected: false },
  },
}

/** Day status relative to calorie goals (for calendar dots). */
export type DayCalorieStatus = 'none' | 'on-target' | 'in-range' | 'over'

export function dayCalorieStatus(
  totalCalories: number,
  hasEntries: boolean,
  lower: number,
  upper: number,
): DayCalorieStatus {
  if (!hasEntries) return 'none'
  if (totalCalories < lower) return 'on-target'
  if (totalCalories <= upper) return 'in-range'
  return 'over'
}
