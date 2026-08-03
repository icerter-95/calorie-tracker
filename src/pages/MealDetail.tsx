import { useCallback, useState } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import MealForm from '../components/MealForm'
import MealPhoto from '../components/MealPhoto'
import { deleteMeal, updateMeal } from '../db'
import { useMeal } from '../hooks/useData'
import { useRegisterPullToRefresh } from '../hooks/useRegisterPullToRefresh'
import { formatDisplayDate } from '../lib/dates'
import { roundMacro } from '../lib/macros'
import type { MealInput } from '../types'
import { MEAL_TYPE_LABELS } from '../types'

type LocationState = {
  from?: string
}

export default function MealDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const fromPath = (location.state as LocationState | null)?.from ?? '/'
  const { meal, error, reload } = useMeal(id)
  const [editing, setEditing] = useState(false)
  const [actionError, setActionError] = useState<string | null>(null)

  const pullToRefresh = useCallback(async () => {
    await reload()
  }, [reload])

  useRegisterPullToRefresh(pullToRefresh)

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
    return <p className="text-sm text-stone-500 dark:text-stone-400">Loading…</p>
  }

  if (!meal) {
    return (
      <div className="space-y-3">
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {error ?? 'Meal not found.'}
        </p>
        <button
          type="button"
          onClick={() => navigate(fromPath)}
          className="text-sm font-medium text-teal-700 dark:text-teal-400"
        >
          Go back
        </button>
      </div>
    )
  }

  if (editing) {
    return (
      <div className="space-y-3">
        {(error || actionError) && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {actionError ?? error}
          </p>
        )}
        <MealForm
          initial={meal}
          onSave={handleSave}
          onCancel={() => {
            setEditing(false)
            setActionError(null)
          }}
          onDelete={() => void handleDelete()}
        />
      </div>
    )
  }

  const hasMacros = meal.proteinG > 0 || meal.carbsG > 0 || meal.fatG > 0

  return (
    <div className="space-y-4">
      {(error || actionError) && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {actionError ?? error}
        </p>
      )}

      <article className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
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
              <p className="text-xs font-medium uppercase tracking-wide text-teal-700 dark:text-teal-400">
                {MEAL_TYPE_LABELS[meal.mealType]}
              </p>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                {formatDisplayDate(meal.date)}
              </p>
              <h2 className="mt-1 text-lg font-semibold text-stone-900 dark:text-stone-50">
                {meal.description || 'Meal'}
              </h2>
              <p className="text-2xl font-semibold text-stone-900 dark:text-stone-50">
                {meal.totalCalories} kcal
              </p>
              {hasMacros && (
                <p className="text-sm text-stone-500 dark:text-stone-400">
                  P {roundMacro(meal.proteinG)}g · C {roundMacro(meal.carbsG)}g · F{' '}
                  {roundMacro(meal.fatG)}g
                </p>
              )}
            </div>
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="shrink-0 rounded-lg px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Edit
            </button>
          </div>

          {meal.ingredients.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {meal.ingredients.map((tag) => (
                <span
                  key={tag}
                  className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}

          {meal.items.length > 0 && (
            <ul className="space-y-1 text-sm text-stone-600 dark:text-stone-300">
              {meal.items.map((item, i) => (
                <li key={i} className="flex justify-between gap-2">
                  <span>{item.name || 'Item'}</span>
                  <span className="shrink-0 text-stone-500 dark:text-stone-400">
                    {item.calories} kcal
                  </span>
                </li>
              ))}
            </ul>
          )}

          {meal.note && (
            <p className="text-sm italic text-stone-500 dark:text-stone-400">{meal.note}</p>
          )}
        </div>
      </article>
    </div>
  )
}
