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
      className="-mx-1 flex items-center gap-3 rounded-xl px-1 py-3 transition hover:bg-hover/70"
    >
      {meal.photoUrl ? (
        <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-muted">
          <MealPhoto
            photoUrl={meal.photoUrl}
            alt={meal.description || MEAL_TYPE_LABELS[meal.mealType]}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          aria-hidden
          className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-muted text-content-faint"
        >
          <span className="text-[10px] font-medium">No photo</span>
        </div>
      )}

      <div className="min-w-0 flex-1">
        {!hideMealType && (
          <p className="text-[10px] font-medium uppercase tracking-wider text-content-faint">
            {MEAL_TYPE_LABELS[meal.mealType]}
          </p>
        )}
        <p className="line-clamp-2 text-sm leading-snug text-content">
          {meal.description || 'Meal'}
        </p>
        {hasMacros && (
          <p className="mt-0.5 text-xs text-content-faint">
            P {roundMacro(meal.proteinG)}g · C {roundMacro(meal.carbsG)}g · F{' '}
            {roundMacro(meal.fatG)}g
          </p>
        )}
      </div>

      <p className="shrink-0 text-base font-semibold tabular-nums tracking-tight text-content">
        {meal.totalCalories}
      </p>
    </article>
  )
}
