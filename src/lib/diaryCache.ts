/**
 * Last-known Diary data on this device. Shown immediately on open, then
 * refreshed from Supabase (stale-while-revalidate). Keyed by user so account
 * switch does not flash the wrong meals.
 */
import type { MealEntry } from '../types'

const STORAGE_PREFIX = 'calorie-tracker.diary-cache.'
const MAX_CACHED_MEAL_DAYS = 28
const MAX_CACHED_SUMMARY_DAYS = 120

export type CachedDaySummary = {
  totalCalories: number
  hasEntries: boolean
}

type DiaryCache = {
  mealsByDate: Record<string, MealEntry[]>
  summaries: Record<string, CachedDaySummary>
}

function storageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

function emptyCache(): DiaryCache {
  return { mealsByDate: {}, summaries: {} }
}

function readCache(userId: string): DiaryCache {
  try {
    const raw = localStorage.getItem(storageKey(userId))
    if (!raw) return emptyCache()
    const parsed = JSON.parse(raw) as Partial<DiaryCache>
    return {
      mealsByDate:
        parsed.mealsByDate && typeof parsed.mealsByDate === 'object' ? parsed.mealsByDate : {},
      summaries: parsed.summaries && typeof parsed.summaries === 'object' ? parsed.summaries : {},
    }
  } catch {
    return emptyCache()
  }
}

function pruneOldest(record: Record<string, unknown>, maxKeys: number) {
  const keys = Object.keys(record).sort()
  if (keys.length <= maxKeys) return
  for (const key of keys.slice(0, keys.length - maxKeys)) {
    delete record[key]
  }
}

function writeCache(userId: string, cache: DiaryCache) {
  pruneOldest(cache.mealsByDate, MAX_CACHED_MEAL_DAYS)
  pruneOldest(cache.summaries, MAX_CACHED_SUMMARY_DAYS)
  try {
    localStorage.setItem(storageKey(userId), JSON.stringify(cache))
  } catch {
    // Quota or private mode — skip persist; in-memory still works this session.
  }
}

/** Cached meals for one day, or undefined if we have never stored that day. */
export function readCachedMealsForDate(userId: string, dateKey: string): MealEntry[] | undefined {
  const meals = readCache(userId).mealsByDate[dateKey]
  return meals ? meals : undefined
}

export function writeCachedMealsForDate(userId: string, dateKey: string, meals: MealEntry[]) {
  const cache = readCache(userId)
  cache.mealsByDate[dateKey] = meals
  cache.summaries[dateKey] = {
    totalCalories: meals.reduce((sum, meal) => sum + meal.totalCalories, 0),
    hasEntries: meals.length > 0,
  }
  writeCache(userId, cache)
}

export function readCachedSummaries(userId: string): Record<string, CachedDaySummary> {
  return readCache(userId).summaries
}

export function mergeCachedSummaries(
  userId: string,
  range: Record<string, CachedDaySummary>,
): Record<string, CachedDaySummary> {
  const cache = readCache(userId)
  cache.summaries = { ...cache.summaries, ...range }
  writeCache(userId, cache)
  return cache.summaries
}

/** Drop this user's Diary snapshot (sample data / clear cloud data). */
export function clearDiaryCache(userId: string) {
  try {
    localStorage.removeItem(storageKey(userId))
  } catch {
    // ignore storage failures
  }
}
