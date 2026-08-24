/**
 * Call the estimate-meal and suggest-ingredients Edge Functions (Gemini).
 * estimate-meal accepts a photo, text, and/or a portion comment (userNote).
 * Used by the add-meal flow, MealForm retake, and the ingredients backfill.
 */
import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { blobToBase64 } from './compressImage'
import { normalizeIngredientTags } from './ingredients'

export type PlateEstimate = {
  description: string
  calories: number
  proteinG: number
  carbsG: number
  fatG: number
  ingredients: string[]
}

export type EstimateMealInput = {
  image?: Blob
  text?: string
  userNote?: string
}

/** Photo and/or text → Gemini estimate (description, kcal, macros, tags). */
export async function estimateMeal(input: EstimateMealInput): Promise<PlateEstimate> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const text = input.text?.trim() || ''
  const userNote = input.userNote?.trim() || ''
  if (!input.image && !text) {
    throw new Error('Add a photo or describe the meal.')
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session) throw new Error('You must be signed in to estimate a meal.')

  const body: {
    imageBase64?: string
    mimeType?: string
    text?: string
    userNote?: string
  } = {}

  if (input.image) {
    body.imageBase64 = await blobToBase64(input.image)
    body.mimeType = 'image/jpeg'
  }
  if (text) body.text = text
  if (userNote) body.userNote = userNote

  const { data, error } = await supabase.functions.invoke<{
    description?: string
    calories?: number
    proteinG?: number
    carbsG?: number
    fatG?: number
    ingredients?: string[]
    error?: string
  }>('estimate-meal', { body })

  if (error) {
    const detail = await readFunctionError(error, data)
    throw new Error(detail)
  }
  if (!data || data.error) {
    throw new Error(data?.error || 'Estimate returned no data')
  }

  return {
    description: (data.description || '').trim(),
    calories: Math.max(0, Math.round(Number(data.calories) || 0)),
    proteinG: Math.max(0, Number(data.proteinG) || 0),
    carbsG: Math.max(0, Number(data.carbsG) || 0),
    fatG: Math.max(0, Number(data.fatG) || 0),
    ingredients: normalizeIngredientTags(
      Array.isArray(data.ingredients) ? data.ingredients.map(String) : [],
    ),
  }
}

/** Photo → Gemini estimate (description, kcal, macros, tags). */
export async function estimatePlateFromPhoto(
  blob: Blob,
  userNote?: string,
): Promise<PlateEstimate> {
  return estimateMeal({ image: blob, userNote })
}

/** Voice/text → Gemini estimate (same plate shape as photo). */
export async function estimatePlateFromText(text: string): Promise<PlateEstimate> {
  return estimateMeal({ text })
}

/** Description text → ingredient tags (MealForm Suggest + Data backfill). */
export async function suggestIngredientsFromText(text: string): Promise<string[]> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error('Add a description or food names first.')
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session) throw new Error('You must be signed in to suggest tags.')

  const { data, error } = await supabase.functions.invoke<{
    ingredients?: string[]
    error?: string
  }>('suggest-ingredients', {
    body: { text: trimmed },
  })

  if (error) {
    const detail = await readFunctionError(error, data)
    throw new Error(detail)
  }
  if (!data || data.error) {
    throw new Error(data?.error || 'Tag suggestion returned no data')
  }

  return normalizeIngredientTags(
    Array.isArray(data.ingredients) ? data.ingredients.map(String) : [],
  )
}

/** Pull a readable error string out of a failed Edge Function response. */
async function readFunctionError(
  error: Error,
  data: { error?: string } | null,
): Promise<string> {
  if (data && typeof data === 'object' && data.error) {
    return String(data.error)
  }

  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json()
      if (body && typeof body === 'object' && 'error' in body && body.error) {
        return String(body.error)
      }
    } catch {
      try {
        const text = await error.context.text()
        if (text) return text.slice(0, 300)
      } catch {
        // fall through
      }
    }
  }

  return error.message || 'Estimate request failed'
}
