export type ThemePreference = 'light' | 'dark' | 'system'

export type HealthConnectionId = 'apple-health' | 'google-fit'

export interface HealthConnection {
  id: HealthConnectionId
  connected: boolean
  lastSyncAt?: number
}

export interface AppSettings {
  theme: ThemePreference
  dailyCalorieGoal: number
  healthConnections: Record<HealthConnectionId, HealthConnection>
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  dailyCalorieGoal: 2200,
  healthConnections: {
    'apple-health': { id: 'apple-health', connected: false },
    'google-fit': { id: 'google-fit', connected: false },
  },
}
