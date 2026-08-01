import { fetchAllMeals, updateMealIngredients } from '../db'
import { suggestIngredientsFromText } from './estimateMeal'
import { mealTextForTagSuggestion, normalizeIngredientTags } from './ingredients'
import type { MealEntry } from '../types'

export type BackfillProgress = {
  total: number
  done: number
  updated: number
  skipped: number
  failed: number
  currentLabel?: string
}

/**
 * Suggest + save ingredient tags for meals that have none.
 * Rate-limits slightly to reduce Gemini free-tier 429s.
 */
export async function backfillMealIngredients(
  onProgress?: (p: BackfillProgress) => void,
): Promise<BackfillProgress> {
  const meals = await fetchAllMeals()
  const targets = meals.filter((m) => m.ingredients.length === 0)
  const progress: BackfillProgress = {
    total: targets.length,
    done: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
  }
  onProgress?.({ ...progress })

  for (const meal of targets) {
    progress.currentLabel = meal.description || meal.items.map((i) => i.name).join(', ') || meal.id
    const text = mealTextForTagSuggestion(meal)
    if (!text.trim()) {
      progress.skipped += 1
      progress.done += 1
      onProgress?.({ ...progress })
      continue
    }

    try {
      const tags = await suggestIngredientsFromText(text)
      const normalized = normalizeIngredientTags(tags)
      if (normalized.length === 0) {
        progress.skipped += 1
      } else {
        await updateMealIngredients(meal.id, normalized)
        progress.updated += 1
      }
    } catch {
      progress.failed += 1
    }

    progress.done += 1
    onProgress?.({ ...progress })

    // Small pause between AI calls
    await sleep(400)
  }

  progress.currentLabel = undefined
  onProgress?.({ ...progress })
  return progress
}

export function mealsMissingIngredients(meals: MealEntry[]): number {
  return meals.filter((m) => m.ingredients.length === 0).length
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
