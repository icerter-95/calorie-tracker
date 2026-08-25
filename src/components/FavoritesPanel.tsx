/**
 * Pick a saved meal, confirm slot, then log a copy for the selected day.
 */
import { useEffect, useState } from 'react'
import { fetchFavorites } from '../db'
import { useKeyboardInset, useLockBodyScroll } from '../hooks/useOverlay'
import { errorMessage } from '../lib/errors'
import { copyMealPhoto } from '../lib/mealPhotos'
import { roundMacro } from '../lib/macros'
import type { FavoriteMeal, MealInput, MealType } from '../types'
import MealEstimateReview from './MealEstimateReview'
import MealPhoto from './MealPhoto'
import MealSlotPicker from './MealSlotPicker'

interface FavoritesPanelProps {
  date: string
  mealType: MealType
  onMealTypeChange: (slot: MealType) => void
  onCancel: () => void
  onSave: (data: MealInput) => Promise<void>
}

export default function FavoritesPanel({
  date,
  mealType,
  onMealTypeChange,
  onCancel,
  onSave,
}: FavoritesPanelProps) {
  useLockBodyScroll()
  const keyboardInset = useKeyboardInset()
  const [favorites, setFavorites] = useState<FavoriteMeal[] | undefined>(undefined)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [selected, setSelected] = useState<FavoriteMeal | null>(null)
  const [description, setDescription] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    fetchFavorites()
      .then((rows) => {
        if (!cancelled) setFavorites(rows)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setLoadError(errorMessage(err, 'Could not load favorites'))
          setFavorites([])
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  function pickFavorite(fav: FavoriteMeal) {
    setSelected(fav)
    setDescription(fav.name)
    setCalories(fav.totalCalories ? String(fav.totalCalories) : '')
    setProtein(fav.proteinG ? String(fav.proteinG) : '')
    setCarbs(fav.carbsG ? String(fav.carbsG) : '')
    setFat(fav.fatG ? String(fav.fatG) : '')
    setIngredients(fav.ingredients)
    setError(null)
  }

  async function handleSave() {
    if (!selected) return
    const desc = description.trim()
    const totals = {
      calories: Number(calories) || 0,
      proteinG: roundMacro(Number(protein) || 0),
      carbsG: roundMacro(Number(carbs) || 0),
      fatG: roundMacro(Number(fat) || 0),
    }
    if (!desc) {
      setError('Add a description.')
      return
    }
    if (totals.calories <= 0 && totals.proteinG <= 0 && totals.carbsG <= 0 && totals.fatG <= 0) {
      setError('Enter calories or macros.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      let photoUrl: string | undefined
      if (selected.photoUrl) {
        photoUrl = await copyMealPhoto(selected.photoUrl)
      }
      await onSave({
        date,
        mealType,
        description: desc,
        photoUrl,
        items: [],
        ingredients,
        totalCalories: Math.round(totals.calories),
        proteinG: totals.proteinG,
        carbsG: totals.carbsG,
        fatG: totals.fatG,
        note: selected.note,
      })
    } catch (err) {
      setError(errorMessage(err, 'Could not save meal'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100 pt-[env(safe-area-inset-top,0px)] dark:bg-stone-950">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-2 dark:border-stone-800">
        <div className="flex min-w-0 items-center gap-2">
          {selected && (
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-lg px-1.5 py-1 text-sm font-medium text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-teal-950/40"
            >
              ← List
            </button>
          )}
          <h2 className="truncate text-lg font-semibold text-stone-900 dark:text-stone-50">
            {selected ? 'Review' : 'Favorites'}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-2 py-1 text-sm font-medium text-stone-600 hover:bg-stone-200 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Close
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto w-full max-w-lg space-y-3">
          {selected ? (
            <>
              {selected.photoUrl && (
                <div className="overflow-hidden rounded-2xl ring-1 ring-stone-200 dark:ring-stone-700">
                  <MealPhoto
                    photoUrl={selected.photoUrl}
                    alt={selected.name}
                    className="max-h-48 w-full object-cover"
                  />
                </div>
              )}
              <MealSlotPicker value={mealType} onChange={onMealTypeChange} disabled={saving} />
              <MealEstimateReview
                description={description}
                onDescriptionChange={setDescription}
                calories={calories}
                onCaloriesChange={setCalories}
                protein={protein}
                onProteinChange={setProtein}
                carbs={carbs}
                onCarbsChange={setCarbs}
                fat={fat}
                onFatChange={setFat}
                ingredients={ingredients}
                disabled={saving}
              />
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
            </>
          ) : favorites === undefined ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Loading…</p>
          ) : loadError ? (
            <p className="text-sm text-red-600 dark:text-red-400">{loadError}</p>
          ) : favorites.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-sm text-stone-500 ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700">
              No favorites yet. Open a meal and tap the heart to save one.
            </p>
          ) : (
            <ul className="space-y-2">
              {favorites.map((fav) => (
                <li key={fav.id}>
                  <button
                    type="button"
                    onClick={() => pickFavorite(fav)}
                    className="flex w-full items-center gap-3 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:ring-stone-700 dark:hover:bg-stone-800"
                  >
                    {fav.photoUrl ? (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
                        <MealPhoto
                          photoUrl={fav.photoUrl}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-[10px] font-medium text-stone-400 dark:bg-stone-800 dark:text-stone-500">
                        No photo
                      </div>
                    )}
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-stone-800 dark:text-stone-100">
                        {fav.name}
                      </span>
                      <span className="block text-sm font-semibold text-stone-900 dark:text-stone-50">
                        {fav.totalCalories} kcal
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {selected && (
        <div
          className="shrink-0 border-t border-stone-200 bg-white px-4 pt-3 dark:border-stone-800 dark:bg-stone-950"
          style={{ paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px) + ${keyboardInset}px)` }}
        >
          <div className="mx-auto w-full max-w-lg">
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving}
              className="w-full rounded-xl bg-teal-700 py-3 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
