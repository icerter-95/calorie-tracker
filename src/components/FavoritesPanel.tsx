/**
 * Pick a saved meal, confirm slot, then log a copy for the selected day.
 */
import { useEffect, useState } from 'react'
import { fetchFavorites } from '../db'
import { errorMessage } from '../lib/errors'
import { copyMealPhoto } from '../lib/mealPhotos'
import { roundMacro } from '../lib/macros'
import type { FavoriteMeal, MealInput, MealType } from '../types'
import MealEstimateReview from './MealEstimateReview'
import MealPhoto from './MealPhoto'
import MealSlotPicker from './MealSlotPicker'
import ActionBar from './ui/ActionBar'
import Button from './ui/Button'
import Takeover from './ui/Takeover'

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
    <Takeover
      title={selected ? 'Review' : 'Favorites'}
      onClose={onCancel}
      closeDisabled={saving}
      leading={
        selected ? (
          <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>
            ← List
          </Button>
        ) : undefined
      }
      footer={
        selected ? (
          <ActionBar
            primary={
              <Button
                onClick={() => void handleSave()}
                disabled={saving}
                busy={saving}
                busyLabel="Saving…"
              >
                Save
              </Button>
            }
          />
        ) : undefined
      }
    >
      {selected ? (
        <>
          {selected.photoUrl && (
            <div className="overflow-hidden rounded-2xl ring-1 ring-line">
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
          {error && <p className="text-sm text-danger">{error}</p>}
        </>
      ) : favorites === undefined ? (
        <p className="text-sm text-content-subtle">Loading…</p>
      ) : loadError ? (
        <p className="text-sm text-danger">{loadError}</p>
      ) : favorites.length === 0 ? (
        <p className="rounded-2xl bg-raised p-4 text-sm text-content-subtle ring-1 ring-line">
          No favorites yet. Open a meal and tap the heart to save one.
        </p>
      ) : (
        <ul className="divide-y divide-line">
          {favorites.map((fav) => (
            <li key={fav.id}>
              <button
                type="button"
                onClick={() => pickFavorite(fav)}
                className="-mx-1 flex w-[calc(100%+0.5rem)] items-center gap-3 rounded-xl px-1 py-3 text-left hover:bg-hover/70"
              >
                {fav.photoUrl ? (
                  <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-muted">
                    <MealPhoto photoUrl={fav.photoUrl} alt="" className="h-full w-full object-cover" />
                  </div>
                ) : (
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-muted text-[10px] font-medium text-content-faint">
                    No photo
                  </div>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-content">
                    {fav.name}
                  </span>
                </span>
                <span className="shrink-0 text-base font-semibold tabular-nums tracking-tight text-content">
                  {fav.totalCalories}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Takeover>
  )
}
