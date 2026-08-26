/**
 * Single meal view. Shows photo, calories, macros, tags; Edit opens a
 * bottom curtain over this page.
 * Heart saves a copy as a favorite (photo is duplicated so logs stay independent).
 * Back goes to Diary or Progress depending on how you arrived.
 */
import { useCallback, useEffect, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import { FavoriteHeart } from '../components/FavoriteToggle'
import MealForm from '../components/MealForm'
import MealPhoto from '../components/MealPhoto'
import Button from '../components/ui/Button'
import { addFavorite, deleteFavorite, deleteMeal, fetchFavorites, updateMeal } from '../db'
import { useMeal } from '../hooks/useData'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import { formatDisplayDate } from '../lib/dates'
import { errorMessage, withFavoriteSetupHint } from '../lib/errors'
import { roundMacro } from '../lib/macros'
import { copyMealPhoto } from '../lib/mealPhotos'
import type { FavoriteMeal, MealEntry, MealInput } from '../types'
import { MEAL_TYPE_LABELS } from '../types'

type LocationState = {
  from?: string
}

function matchingFavorite(favorites: FavoriteMeal[], meal: MealEntry): FavoriteMeal | undefined {
  const name = (meal.description || 'Meal').trim().toLowerCase()
  return favorites.find(
    (fav) => fav.name.trim().toLowerCase() === name && fav.totalCalories === meal.totalCalories,
  )
}

export default function MealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const fromPath = (location.state as LocationState | null)?.from ?? '/'
  const { meal, error, reload } = useMeal(id)
  const [editing, setEditing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)
  const [favorites, setFavorites] = useState<FavoriteMeal[]>([])
  const [favoriteBusy, setFavoriteBusy] = useState(false)

  const pullToRefresh = useCallback(async () => {
    await reload()
  }, [reload])

  useRegisterPullToRefresh(pullToRefresh)

  useEffect(() => {
    let cancelled = false
    fetchFavorites()
      .then((rows) => {
        if (!cancelled) {
          setFavorites(rows)
          setActionError(null)
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setFavorites([])
          setActionError(withFavoriteSetupHint(errorMessage(err, 'Could not load favorites')))
        }
      })
    return () => {
      cancelled = true
    }
  }, [meal?.id])

  async function handleFavoriteToggle() {
    if (!meal) return
    setActionError(null)
    const existing = matchingFavorite(favorites, meal)
    setFavoriteBusy(true)
    try {
      if (existing) {
        await deleteFavorite(existing.id)
        setFavorites((prev) => prev.filter((fav) => fav.id !== existing.id))
        return
      }
      // Prefer a duplicated photo; still save the favorite if copy fails.
      let photoUrl: string | undefined
      if (meal.photoUrl) {
        try {
          photoUrl = await copyMealPhoto(meal.photoUrl)
        } catch {
          photoUrl = undefined
        }
      }
      const saved = await addFavorite({
        name: meal.description?.trim() || 'Meal',
        photoUrl,
        ingredients: meal.ingredients ?? [],
        totalCalories: meal.totalCalories,
        proteinG: meal.proteinG,
        carbsG: meal.carbsG,
        fatG: meal.fatG,
        note: meal.note,
      })
      setFavorites((prev) => [saved, ...prev])
    } catch (err) {
      setActionError(withFavoriteSetupHint(errorMessage(err, 'Could not update favorite')))
    } finally {
      setFavoriteBusy(false)
    }
  }

  async function handleSave(data: MealInput) {
    if (!meal) return
    setActionError(null)
    try {
      await updateMeal(meal.id, data)
      setEditing(false)
      await reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save meal')
    }
  }

  async function handleDelete() {
    if (!meal) return
    setActionError(null)
    try {
      await deleteMeal(meal.id)
      navigate(fromPath, { replace: true })
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete meal')
    }
  }

  if (meal === undefined) {
    return <p className="text-sm text-content-subtle">Loading…</p>
  }

  if (!meal) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-strong">
          {error ?? 'Meal not found.'}
        </p>
        <button
          type="button"
          onClick={() => navigate(fromPath)}
          className="text-sm font-medium text-accent-ink"
        >
          Go back
        </button>
      </div>
    )
  }

  const hasMacros = meal.proteinG > 0 || meal.carbsG > 0 || meal.fatG > 0
  const savedFavorite = matchingFavorite(favorites, meal)

  // Read-only meal card (photo, totals, tags, optional item list).
  return (
    <div className="space-y-4">
      {(error || actionError) && (
        <p className="rounded-xl bg-danger-soft px-3 py-2 text-sm text-danger-strong">
          {actionError ?? error}
        </p>
      )}

      <article className="overflow-hidden rounded-2xl bg-raised shadow-sm ring-1 ring-line">
        {meal.photoUrl && (
          <MealPhoto
            photoUrl={meal.photoUrl}
            alt={meal.description || MEAL_TYPE_LABELS[meal.mealType]}
            className="max-h-72 w-full object-cover"
          />
        )}

        <div className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-accent-ink">
                {MEAL_TYPE_LABELS[meal.mealType]}
              </p>
              <p className="text-xs text-content-subtle">
                {formatDisplayDate(meal.date)}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-content">
                {meal.description || 'Meal'}
              </h2>
              <p className="text-2xl font-semibold text-content">
                {meal.totalCalories} kcal
              </p>
              {hasMacros && (
                <p className="text-sm text-content-subtle">
                  P {roundMacro(meal.proteinG)}g · C {roundMacro(meal.carbsG)}g · F{' '}
                  {roundMacro(meal.fatG)}g
                </p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              <button
                type="button"
                onClick={() => void handleFavoriteToggle()}
                disabled={favoriteBusy}
                aria-pressed={Boolean(savedFavorite)}
                aria-label={savedFavorite ? 'Remove from favorites' : 'Save as favorite'}
                className="rounded-lg p-1.5 text-accent-ink hover:bg-accent-soft disabled:opacity-60"
              >
                <FavoriteHeart filled={Boolean(savedFavorite)} />
              </button>
              <Button variant="secondary" size="sm" onClick={() => setEditing(true)}>
                Edit
              </Button>
            </div>
          </div>

          {meal.ingredients.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {meal.ingredients.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-muted px-1.5 py-0.5 text-[11px] font-medium text-content-muted"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {meal.items.length > 0 && (
            <ul className="space-y-1 text-sm text-content-muted">
              {meal.items.map((item, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{item.name || 'Item'}</span>
                  <span className="shrink-0 text-content-subtle">
                    {item.calories} kcal
                  </span>
                </li>
              ))}
            </ul>
          )}

          {meal.note && (
            <p className="text-sm italic text-content-subtle">{meal.note}</p>
          )}
        </div>
      </article>

      {editing && (
        <MealForm
          initial={meal}
          onSave={handleSave}
          onCancel={() => {
            setEditing(false)
            setActionError(null)
          }}
          onDelete={() => void handleDelete()}
        />
      )}
    </div>
  )
}
