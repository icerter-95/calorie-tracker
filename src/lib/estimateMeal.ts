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

export async function estimatePlateFromPhoto(blob: Blob): Promise<PlateEstimate> {
  if (!supabase) {
    throw new Error('Supabase is not configured.')
  }

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()
  if (sessionError) throw sessionError
  if (!session) throw new Error('You must be signed in to estimate a meal.')

  const imageBase64 = await blobToBase64(blob)

  const { data, error } = await supabase.functions.invoke<{
    description?: string
    calories?: number
    proteinG?: number
    carbsG?: number
    fatG?: number
    ingredients?: string[]
    error?: string
  }>('estimate-meal', {
    body: {
      imageBase64,
      mimeType: 'image/jpeg',
    },
  })

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
