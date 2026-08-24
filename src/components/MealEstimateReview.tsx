/**
 * Confirm/edit Gemini results before Save. Tags are read-only on create;
 * kcal / macros can be corrected.
 */
interface MealEstimateReviewProps {
  description: string
  onDescriptionChange: (value: string) => void
  calories: string
  onCaloriesChange: (value: string) => void
  protein: string
  onProteinChange: (value: string) => void
  carbs: string
  onCarbsChange: (value: string) => void
  fat: string
  onFatChange: (value: string) => void
  ingredients: string[]
  disabled?: boolean
}

export default function MealEstimateReview({
  description,
  onDescriptionChange,
  calories,
  onCaloriesChange,
  protein,
  onProteinChange,
  carbs,
  onCarbsChange,
  fat,
  onFatChange,
  ingredients,
  disabled,
}: MealEstimateReviewProps) {
  return (
    <div className="space-y-3">
      <label className="block text-sm">
        <span className="mb-1 block text-stone-600 dark:text-stone-300">Description</span>
        <input
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          disabled={disabled}
          placeholder="e.g. Chicken rice bowl"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
        />
      </label>

      <div className="grid grid-cols-4 gap-1.5">
        <NumberField label="kcal" value={calories} onChange={onCaloriesChange} disabled={disabled} />
        <NumberField label="Protein" value={protein} onChange={onProteinChange} step disabled={disabled} />
        <NumberField label="Carbs" value={carbs} onChange={onCarbsChange} step disabled={disabled} />
        <NumberField label="Fat" value={fat} onChange={onFatChange} step disabled={disabled} />
      </div>

      {ingredients.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {ingredients.map((tag) => (
            <span
              key={tag}
              className="rounded-md bg-stone-100 px-1.5 py-0.5 text-[11px] font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step,
  disabled,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  step?: boolean
  disabled?: boolean
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-stone-600 dark:text-stone-300">{label}</span>
      <input
        type="number"
        min={0}
        step={step ? 0.1 : 1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-stone-300 bg-white px-1.5 py-2 text-sm text-stone-900 disabled:opacity-60 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-50"
      />
    </label>
  )
}
