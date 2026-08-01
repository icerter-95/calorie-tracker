import type { MealEntry } from '../types'
import { MEAL_TYPE_LABELS } from '../types'
import { roundMacro } from '../lib/macros'
import MealPhoto from './MealPhoto'

interface MealCardProps {
  meal: MealEntry
  onEdit: () => void
  onDelete: () => void
  hideDelete?: boolean
  /** When true, omit the meal-type label (parent already groups by slot). */
  hideMealType?: boolean
}

export default function MealCard({
  meal,
  onEdit,
  onDelete,
  hideDelete,
  hideMealType,
}: MealCardProps) {
  const hasMacros = meal.proteinG > 0 || meal.carbsG > 0 || meal.fatG > 0

  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
      {meal.photoUrl && (
        <MealPhoto
          photoUrl={meal.photoUrl}
          alt={meal.description || MEAL_TYPE_LABELS[meal.mealType]}
          className="mb-3 max-h-40 w-full rounded-xl object-cover"
        />
      )}
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          {!hideMealType && (
            <p className="text-xs font-medium uppercase tracking-wide text-teal-700 dark:text-teal-400">
              {MEAL_TYPE_LABELS[meal.mealType]}
            </p>
          )}
          {meal.description && (
            <p className="text-sm font-medium text-stone-800 dark:text-stone-100">
              {meal.description}
            </p>
          )}
          <p className="text-lg font-semibold text-stone-900 dark:text-stone-50">
            {meal.totalCalories} kcal
          </p>
          {hasMacros && (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              P {roundMacro(meal.proteinG)}g · C {roundMacro(meal.carbsG)}g · F{' '}
              {roundMacro(meal.fatG)}g
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="rounded-lg px-2 py-1 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
          >
            Edit
          </button>
          {!hideDelete && (
            <button
              onClick={onDelete}
              className="rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      {meal.ingredients.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-1">
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
        <p className="mt-2 text-sm italic text-stone-500 dark:text-stone-400">{meal.note}</p>
      )}
    </article>
  )
}
