/**
 * Database API: all Supabase reads/writes for meals, weights, steps, and
 * Apple Health sync tokens. Pages should go through this instead of querying
 * tables directly. Row → UI mapping lives in mappers.ts.
 */
import { supabase } from '../lib/supabase'
import { deleteAllUserMealPhotos, deleteMealPhoto } from '../lib/mealPhotos'
import { clearDiaryCache } from '../lib/diaryCache'
import { getCustomRange } from '../lib/dates'
import { errorMessage, withFavoriteSetupHint } from '../lib/errors'
import type {
  FavoriteMeal,
  FavoriteMealInput,
  HealthSyncTokenInfo,
  MealInput,
  MealEntry,
  StepsEntry,
  WeightEntry,
  WeightInput,
} from '../types'
import {
  mapFavoriteMealRow,
  mapMealRow,
  mapStepsRow,
  mapWeightRow,
  type FavoriteMealRow,
  type MealRow,
  type StepsRow,
  type WeightRow,
} from './mappers'

// Fail fast if env keys are missing or the user is not signed in.
function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  return supabase
}

async function requireUserId() {
  const client = requireClient()
  const { data, error } = await client.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('You must be signed in.')
  return data.user.id
}

// --- Meals ---
export async function fetchAllMeals(): Promise<MealEntry[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('meals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw error
  return (data as MealRow[]).map(mapMealRow)
}

export async function fetchMealsForDate(dateKey: string): Promise<MealEntry[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('meals')
    .select(
      'id, date, meal_type, description, photo_url, items, ingredients, total_calories, protein_g, carbs_g, fat_g, note, created_at',
    )
    .eq('date', dateKey)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data as MealRow[]).map(mapMealRow)
}

/** Date + calorie totals only — used for Diary week dots, not the meal list. */
export async function fetchCalorieSummariesForRange(
  startDate: string,
  endDate: string,
): Promise<Record<string, { totalCalories: number; hasEntries: boolean }>> {
  const client = requireClient()
  const { data, error } = await client
    .from('meals')
    .select('date, total_calories')
    .gte('date', startDate)
    .lte('date', endDate)

  if (error) throw error

  const summaries: Record<string, { totalCalories: number; hasEntries: boolean }> = {}
  for (const date of getCustomRange(startDate, endDate)) {
    summaries[date] = { totalCalories: 0, hasEntries: false }
  }
  for (const row of data ?? []) {
    const date = row.date as string
    const current = summaries[date] ?? { totalCalories: 0, hasEntries: false }
    current.totalCalories += Number(row.total_calories) || 0
    current.hasEntries = true
    summaries[date] = current
  }
  return summaries
}

/** Distinct yyyy-MM-dd keys that have at least one meal (for the logging streak). */
export async function fetchLoggedDates(): Promise<string[]> {
  const client = requireClient()
  const { data, error } = await client.from('meals').select('date')

  if (error) throw error

  const dates = new Set<string>()
  for (const row of data ?? []) {
    dates.add(row.date as string)
  }
  return [...dates]
}

export async function fetchMealById(id: string): Promise<MealEntry | null> {
  const client = requireClient()
  const { data, error } = await client.from('meals').select('*').eq('id', id).maybeSingle()

  if (error) throw error
  if (!data) return null
  return mapMealRow(data as MealRow)
}

// --- Weights ---
export async function fetchAllWeights(): Promise<WeightEntry[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('weights')
    .select('*')
    .order('date', { ascending: true })

  if (error) throw error
  return (data as WeightRow[]).map(mapWeightRow)
}

export async function addMeal(meal: MealInput) {
  const client = requireClient()
  const userId = await requireUserId()

  const { error } = await client.from('meals').insert({
    user_id: userId,
    date: meal.date,
    meal_type: meal.mealType,
    description: meal.description ?? null,
    photo_url: meal.photoUrl ?? null,
    items: meal.items,
    ingredients: meal.ingredients,
    total_calories: meal.totalCalories,
    protein_g: meal.proteinG,
    carbs_g: meal.carbsG,
    fat_g: meal.fatG,
    note: meal.note ?? null,
  })

  if (error) throw error
}

export async function updateMeal(id: string, meal: MealInput) {
  const client = requireClient()

  const { data: existing, error: fetchError } = await client
    .from('meals')
    .select('photo_url')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) throw fetchError

  const previousPhoto = (existing as { photo_url: string | null } | null)?.photo_url ?? null
  const nextPhoto = meal.photoUrl ?? null

  const { error } = await client
    .from('meals')
    .update({
      date: meal.date,
      meal_type: meal.mealType,
      description: meal.description ?? null,
      photo_url: nextPhoto,
      items: meal.items,
      ingredients: meal.ingredients,
      total_calories: meal.totalCalories,
      protein_g: meal.proteinG,
      carbs_g: meal.carbsG,
      fat_g: meal.fatG,
      note: meal.note ?? null,
    })
    .eq('id', id)

  if (error) throw error

  if (previousPhoto && previousPhoto !== nextPhoto) {
    try {
      await deleteMealPhoto(previousPhoto)
    } catch {
      // Meal row already updated; orphan cleanup can be manual if this fails
    }
  }
}

export async function deleteMeal(id: string) {
  const client = requireClient()

  const { data: existing, error: fetchError } = await client
    .from('meals')
    .select('photo_url')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) throw fetchError

  const { error } = await client.from('meals').delete().eq('id', id)
  if (error) throw error

  const photoUrl = (existing as { photo_url: string | null } | null)?.photo_url
  if (photoUrl) {
    try {
      await deleteMealPhoto(photoUrl)
    } catch {
      // Row deleted; ignore storage cleanup failure
    }
  }
}

// --- Steps (synced from Apple Health) ---
export async function fetchAllSteps(): Promise<StepsEntry[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('steps')
    .select('*')
    .order('date', { ascending: true })

  if (error) throw error
  return (data as StepsRow[]).map(mapStepsRow)
}

export async function fetchStepsForDate(dateKey: string): Promise<StepsEntry | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('steps')
    .select('*')
    .eq('date', dateKey)
    .maybeSingle()

  if (error) throw error
  return data ? mapStepsRow(data as StepsRow) : null
}

export async function addWeight(entry: WeightInput) {
  const client = requireClient()
  const userId = await requireUserId()

  const { error } = await client.from('weights').insert({
    user_id: userId,
    date: entry.date,
    weight_kg: entry.weightKg,
    source: 'manual',
    note: entry.note ?? null,
  })

  if (error) throw error
}

function throwFavoriteError(error: unknown, fallback: string): never {
  throw new Error(withFavoriteSetupHint(errorMessage(error, fallback)))
}

// --- Favorites (saved meals; logging copies onto a new meals row) ---
export async function fetchFavorites(): Promise<FavoriteMeal[]> {
  const client = requireClient()
  const { data, error } = await client
    .from('favorite_meals')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throwFavoriteError(error, 'Could not load favorites')
  return (data as FavoriteMealRow[]).map(mapFavoriteMealRow)
}

export async function addFavorite(favorite: FavoriteMealInput): Promise<FavoriteMeal> {
  const client = requireClient()
  const userId = await requireUserId()

  const { data, error } = await client
    .from('favorite_meals')
    .insert({
      user_id: userId,
      name: favorite.name,
      photo_url: favorite.photoUrl ?? null,
      ingredients: favorite.ingredients ?? [],
      total_calories: favorite.totalCalories,
      protein_g: favorite.proteinG,
      carbs_g: favorite.carbsG,
      fat_g: favorite.fatG,
      note: favorite.note ?? null,
    })
    .select('*')
    .single()

  if (error) throwFavoriteError(error, 'Could not save favorite')
  return mapFavoriteMealRow(data as FavoriteMealRow)
}

export async function deleteFavorite(id: string) {
  const client = requireClient()

  const { data: existing, error: fetchError } = await client
    .from('favorite_meals')
    .select('photo_url')
    .eq('id', id)
    .maybeSingle()
  if (fetchError) throwFavoriteError(fetchError, 'Could not update favorite')

  const { error } = await client.from('favorite_meals').delete().eq('id', id)
  if (error) throwFavoriteError(error, 'Could not update favorite')

  const photoUrl = (existing as { photo_url: string | null } | null)?.photo_url
  if (photoUrl) {
    try {
      await deleteMealPhoto(photoUrl)
    } catch {
      // Row deleted; ignore storage cleanup failure
    }
  }
}

export async function updateWeight(id: string, entry: WeightInput) {
  const client = requireClient()

  const { error } = await client
    .from('weights')
    .update({
      date: entry.date,
      weight_kg: entry.weightKg,
      note: entry.note ?? null,
    })
    .eq('id', id)

  if (error) throw error
}

export async function deleteWeight(id: string) {
  const client = requireClient()
  const { error } = await client.from('weights').delete().eq('id', id)
  if (error) throw error
}

/** Update only ingredient tags (used by backfill). */
export async function updateMealIngredients(id: string, ingredients: string[]) {
  const client = requireClient()
  const { error } = await client.from('meals').update({ ingredients }).eq('id', id)
  if (error) throw error
}

// Wipe this account's meals, favorites, weights, steps, and meal photos (Profile → Data).
export async function clearAllUserData() {
  const client = requireClient()
  const userId = await requireUserId()
  clearDiaryCache(userId)

  try {
    await deleteAllUserMealPhotos()
  } catch {
    // Continue clearing table rows even if storage cleanup fails
  }

  const { error: mealsError } = await client.from('meals').delete().eq('user_id', userId)
  if (mealsError) throw mealsError

  const { error: favoritesError } = await client.from('favorite_meals').delete().eq('user_id', userId)
  if (favoritesError) throw favoritesError

  const { error: weightsError } = await client.from('weights').delete().eq('user_id', userId)
  if (weightsError) throw weightsError

  const { error: stepsError } = await client.from('steps').delete().eq('user_id', userId)
  if (stepsError) throw stepsError
}

// --- Apple Health Shortcut token (create / inspect / revoke) ---
export async function fetchHealthSyncTokenInfo(): Promise<HealthSyncTokenInfo | null> {
  const client = requireClient()
  const { data, error } = await client
    .from('health_sync_tokens')
    .select('token_prefix, created_at, last_used_at')
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  return {
    tokenPrefix: data.token_prefix as string,
    createdAt: new Date(data.created_at as string).getTime(),
    lastUsedAt: data.last_used_at
      ? new Date(data.last_used_at as string).getTime()
      : undefined,
  }
}

/** Creates/replaces the sync token. Returns the plaintext once for the Shortcut. */
export async function rotateHealthSyncToken(): Promise<string> {
  const client = requireClient()
  const userId = await requireUserId()
  const token = generateSyncToken()
  const tokenHash = await sha256Hex(token)
  const tokenPrefix = token.slice(0, 8)

  const { error } = await client.from('health_sync_tokens').upsert({
    user_id: userId,
    token_hash: tokenHash,
    token_prefix: tokenPrefix,
    last_used_at: null,
    created_at: new Date().toISOString(),
  })

  if (error) throw error
  return token
}

export async function deleteHealthSyncToken() {
  const client = requireClient()
  const userId = await requireUserId()
  const { error } = await client.from('health_sync_tokens').delete().eq('user_id', userId)
  if (error) throw error
}

function generateSyncToken() {
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sha256Hex(value: string) {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

export function getHealthSyncEndpoint(): string | null {
  const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
  if (!url) return null
  return `${url.replace(/\/$/, '')}/functions/v1/sync-health`
}

export function getSupabaseAnonKey(): string | null {
  return (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? null
}
