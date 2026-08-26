/**
 * Compact meal row used in Diary and Progress. The whole row opens Meal Detail,
 * where Edit lives — a browse row carries no second action of its own.
 */
import { useNavigate } from 'react-router-dom'
import type { MealEntry } from '../types'
import { MEAL_TYPE_LABELS } from '../types'
import { roundMacro } from '../lib/macros'
import MealPhoto from './MealPhoto'

interface MealCardProps {
  meal: MealEntry
  /** When true, omit the meal-type label (parent already groups by slot). */
  hideMealType?: boolean
  /** Path to return to from the meal detail page. */
  from?: string
}

export default function MealCard({ meal, hideMealType, from = '/' }: MealCardProps) {
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
      className="flex items-start gap-3 rounded-2xl bg-raised p-3 shadow-sm ring-1 ring-line transition hover:bg-hover"
    >
      {meal.photoUrl ? (
        <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl bg-muted">
          <MealPhoto
            photoUrl={meal.photoUrl}
            alt={meal.description || MEAL_TYPE_LABELS[meal.mealType]}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-xl bg-muted text-content-faint"
        >
          <span className="text-xs font-medium">No photo</span>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            {!hideMealType && (
              <p className="text-[11px] font-medium uppercase tracking-wide text-accent-ink">
                {MEAL_TYPE_LABELS[meal.mealType]}
              </p>
            )}
            <p className="line-clamp-2 text-sm font-medium leading-snug text-content">
              {meal.description || 'Meal'}
            </p>
          </div>
          <span aria-hidden className="shrink-0 text-content-faint">
            ›
          </span>
        </div>
        <p className="mt-0.5 text-sm font-semibold text-content">
          {meal.totalCalories} kcal
        </p>
        {hasMacros && (
          <p className="text-xs text-content-subtle">
            P {roundMacro(meal.proteinG)}g · C {roundMacro(meal.carbsG)}g · F{' '}
            {roundMacro(meal.fatG)}g
          </p>
        )}
      </div>
    </article>
  )
}
