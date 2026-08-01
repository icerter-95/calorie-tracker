import { supabase } from '../lib/supabase'
import { deleteAllUserMealPhotos, deleteMealPhoto } from '../lib/mealPhotos'
import type { MealInput, MealEntry, WeightEntry, WeightInput } from '../types'
import { mapMealRow, mapWeightRow, type MealRow, type WeightRow } from './mappers'

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
    .select('*')
    .eq('date', dateKey)
    .order('created_at', { ascending: true })

  if (error) throw error
  return (data as MealRow[]).map(mapMealRow)
}

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

export async function addWeight(entry: WeightInput) {
  const client = requireClient()
  const userId = await requireUserId()

  const { error } = await client.from('weights').insert({
    user_id: userId,
    date: entry.date,
    weight_kg: entry.weightKg,
    note: entry.note ?? null,
  })

  if (error) throw error
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

/** Delete all meals and weights for the signed-in user (RLS-scoped). */
export async function clearAllUserData() {
  const client = requireClient()
  const userId = await requireUserId()

  try {
    await deleteAllUserMealPhotos()
  } catch {
    // Continue clearing table rows even if storage cleanup fails
  }

  const { error: mealsError } = await client.from('meals').delete().eq('user_id', userId)
  if (mealsError) throw mealsError

  const { error: weightsError } = await client.from('weights').delete().eq('user_id', userId)
  if (weightsError) throw weightsError
}
