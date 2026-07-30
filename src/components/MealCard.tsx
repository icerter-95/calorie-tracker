import type { MealEntry } from '../types'
import { MEAL_TYPE_LABELS } from '../types'

interface MealCardProps {
  meal: MealEntry
  onEdit: () => void
  onDelete: () => void
  hideDelete?: boolean
}

export default function MealCard({ meal, onEdit, onDelete, hideDelete }: MealCardProps) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-teal-700">
            {MEAL_TYPE_LABELS[meal.mealType]}
          </p>
          <p className="text-lg font-semibold text-stone-900">{meal.totalCalories} kcal</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="rounded-lg px-2 py-1 text-sm text-stone-600 hover:bg-stone-100"
          >
            Edit
          </button>
          {!hideDelete && (
            <button
              onClick={onDelete}
              className="rounded-lg px-2 py-1 text-sm text-red-600 hover:bg-red-50"
            >
              Delete
            </button>
          )}
        </div>
      </div>

      <ul className="space-y-1 text-sm text-stone-600">
        {meal.items.map((item, i) => (
          <li key={i} className="flex justify-between gap-2">
            <span>{item.name}</span>
            <span>{item.calories} kcal</span>
          </li>
        ))}
      </ul>

      {meal.note && <p className="mt-2 text-sm italic text-stone-500">{meal.note}</p>}
    </article>
  )
}
