import { useNavigate } from 'react-router-dom'
import type { MealEntry } from '../types'
import { MEAL_TYPE_LABELS } from '../types'
import { roundMacro } from '../lib/macros'
import MealPhoto from './MealPhoto'

interface MealCardProps {
  meal: MealEntry
  onEdit: () => void
  /** When true, omit the meal-type label (parent already groups by slot). */
  hideMealType?: boolean
  /** Path to return to from the meal detail page. */
  from?: string
}

export default function MealCard({ meal, onEdit, hideMealType, from = '/' }: MealCardProps) {
  const navigate = useNavigate()
  const hasMacros = meal.proteinG > 0 || meal.carbsG > 0 || meal.fatG > 0

  function openDetail() {
    navigate(`/meal/${meal.id}`, { state: { from } })
  }

  return (
    <article
      role="button"
      tabIndex={0}
      onClick={openDetail}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openDetail()
        }
      }}
      className="flex cursor-pointer gap-3 rounded-2xl bg-white p-3 shadow-sm ring-1 ring-stone-200 transition hover:bg-stone-50 dark:bg-stone-900 dark:ring-stone-700 dark:hover:bg-stone-800/80"
    >
      {meal.photoUrl ? (
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-stone-100 dark:bg-stone-800">
          <MealPhoto
            photoUrl={meal.photoUrl}
            alt={meal.description || MEAL_TYPE_LABELS[meal.mealType]}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-400 dark:bg-stone-800 dark:text-stone-500"
        >
          <span className="text-xs font-medium">No photo</span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            {!hideMealType && (
              <p className="text-[11px] font-medium uppercase tracking-wide text-teal-700 dark:text-teal-400">
                {MEAL_TYPE_LABELS[meal.mealType]}
              </p>
            )}
            <p className="truncate text-sm font-medium text-stone-800 dark:text-stone-100">
              {meal.description || 'Meal'}
            </p>
            <p className="text-base font-semibold text-stone-900 dark:text-stone-50">
              {meal.totalCalories} kcal
            </p>
            {hasMacros && (
              <p className="text-xs text-stone-500 dark:text-stone-400">
                P {roundMacro(meal.proteinG)}g · C {roundMacro(meal.carbsG)}g · F{' '}
                {roundMacro(meal.fatG)}g
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onEdit()
            }}
            className="shrink-0 rounded-lg px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Edit
          </button>
        </div>
      </div>
    </article>
  )
}
