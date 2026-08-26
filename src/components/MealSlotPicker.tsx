/**
 * Breakfast / lunch / dinner / snack picker. Defaults come from
 * defaultMealTypeForNow(); the user can override.
 */
import type { MealType } from '../types'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../types'

interface MealSlotPickerProps {
  value: MealType
  onChange: (slot: MealType) => void
  disabled?: boolean
}

export default function MealSlotPicker({ value, onChange, disabled }: MealSlotPickerProps) {
  return (
    <div className="grid grid-cols-4 gap-1" role="group" aria-label="Meal slot">
      {MEAL_TYPE_ORDER.map((slot) => {
        const selected = value === slot
        return (
          <button
            key={slot}
            type="button"
            disabled={disabled}
            onClick={() => onChange(slot)}
            className={`rounded-lg px-1 py-1.5 text-center text-xs font-medium transition-colors disabled:opacity-60 ${
              selected
                ? 'bg-accent text-on-accent'
                : 'bg-muted text-content-faint hover:text-content-muted'
            }`}
          >
            {MEAL_TYPE_LABELS[slot]}
          </button>
        )
      })}
    </div>
  )
}
