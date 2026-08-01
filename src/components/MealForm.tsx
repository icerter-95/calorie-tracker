import { useEffect, useMemo, useState } from 'react'
import { roundMacro, sumItemMacros } from '../lib/macros'
import type { MealEntry, MealInput, MealItem, MealType } from '../types'
import { MEAL_TYPE_LABELS } from '../types'

interface MealFormProps {
  initial?: MealEntry
  defaultDate?: string
  onSave: (data: MealInput) => void | Promise<void>
  onCancel: () => void
}

const emptyItem = (): MealItem => ({
  name: '',
  calories: 0,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
})

export default function MealForm({ initial, defaultDate, onSave, onCancel }: MealFormProps) {
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? '')
  const [mealType, setMealType] = useState<MealType>(initial?.mealType ?? 'lunch')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [items, setItems] = useState<MealItem[]>(
    initial?.items.length ? initial.items : [emptyItem()],
  )
  const [plateCalories, setPlateCalories] = useState(
    initial && !initial.items.length ? String(initial.totalCalories || '') : '',
  )
  const [plateProtein, setPlateProtein] = useState(
    initial && !initial.items.length ? String(initial.proteinG || '') : '',
  )
  const [plateCarbs, setPlateCarbs] = useState(
    initial && !initial.items.length ? String(initial.carbsG || '') : '',
  )
  const [plateFat, setPlateFat] = useState(
    initial && !initial.items.length ? String(initial.fatG || '') : '',
  )
  const [note, setNote] = useState(initial?.note ?? '')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  useEffect(() => {
    if (!initial) return
    setDate(initial.date)
    setMealType(initial.mealType)
    setDescription(initial.description ?? '')
    setItems(initial.items.length ? initial.items : [emptyItem()])
    setPlateCalories(!initial.items.length ? String(initial.totalCalories || '') : '')
    setPlateProtein(!initial.items.length ? String(initial.proteinG || '') : '')
    setPlateCarbs(!initial.items.length ? String(initial.carbsG || '') : '')
    setPlateFat(!initial.items.length ? String(initial.fatG || '') : '')
    setNote(initial.note ?? '')
  }, [initial])

  const cleanedPreview = useMemo(
    () =>
      items
        .map((item) => ({
          name: item.name.trim(),
          calories: Number(item.calories) || 0,
          proteinG: roundMacro(Number(item.proteinG) || 0),
          carbsG: roundMacro(Number(item.carbsG) || 0),
          fatG: roundMacro(Number(item.fatG) || 0),
        }))
        .filter(
          (item) =>
            item.name ||
            item.calories > 0 ||
            item.proteinG > 0 ||
            item.carbsG > 0 ||
            item.fatG > 0,
        ),
    [items],
  )

  const itemTotals = sumItemMacros(cleanedPreview)
  const usingItems = cleanedPreview.length > 0
  const displayTotals = usingItems
    ? itemTotals
    : {
        calories: Number(plateCalories) || 0,
        proteinG: Number(plateProtein) || 0,
        carbsG: Number(plateCarbs) || 0,
        fatG: Number(plateFat) || 0,
      }

  function updateItem(index: number, field: keyof MealItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length <= 1 ? [emptyItem()] : prev.filter((_, i) => i !== index)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const desc = description.trim()
    const usingItemsNow = cleanedPreview.length > 0

    if (!usingItemsNow && !desc) {
      setFormError('Add a plate description, or at least one food item.')
      return
    }

    const totals = usingItemsNow
      ? sumItemMacros(cleanedPreview)
      : {
          calories: Number(plateCalories) || 0,
          proteinG: roundMacro(Number(plateProtein) || 0),
          carbsG: roundMacro(Number(plateCarbs) || 0),
          fatG: roundMacro(Number(plateFat) || 0),
        }

    if (totals.calories <= 0 && totals.proteinG <= 0 && totals.carbsG <= 0 && totals.fatG <= 0) {
      setFormError('Enter calories or macros for the meal.')
      return
    }

    setSaving(true)
    try {
      await onSave({
        date,
        mealType,
        description: desc || undefined,
        items: usingItemsNow ? cleanedPreview : [],
        totalCalories: Math.round(totals.calories),
        proteinG: roundMacro(totals.proteinG),
        carbsG: roundMacro(totals.carbsG),
        fatG: roundMacro(totals.fatG),
        note: note.trim() || undefined,
      })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save meal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">
          {initial ? 'Edit meal' : 'Add meal'}
        </h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
        >
          Cancel
        </button>
      </div>

      <div className="flex gap-3">
        <label className="flex w-0 min-w-0 flex-1 flex-col overflow-hidden text-sm">
          <span className="mb-1 text-stone-600 dark:text-stone-300">Date</span>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="box-border w-full min-w-0 max-w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
          />
        </label>
        <label className="flex w-0 min-w-0 flex-1 flex-col overflow-hidden text-sm">
          <span className="mb-1 text-stone-600 dark:text-stone-300">Meal</span>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType)}
            className="box-border w-full min-w-0 max-w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
          >
            {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-stone-600 dark:text-stone-300">Plate description (optional)</span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Chicken rice bowl"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
        />
        <span className="mt-1 block text-xs text-stone-400 dark:text-stone-500">
          Use this for a whole plate. Or leave blank and log individual items below.
        </span>
      </label>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-stone-700 dark:text-stone-200">Items</span>
          <button
            type="button"
            onClick={addItem}
            className="text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
          >
            + Add item
          </button>
        </div>

        {items.map((item, index) => (
          <div key={index} className="space-y-2 rounded-xl bg-stone-50 p-3 dark:bg-stone-800/60">
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Food name"
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-50"
              />
              <input
                type="number"
                min={0}
                placeholder="kcal"
                value={item.calories || ''}
                onChange={(e) => updateItem(index, 'calories', e.target.value)}
                className="w-20 rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-50"
              />
              <button
                type="button"
                onClick={() => removeItem(index)}
                className="rounded-lg px-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600 dark:hover:bg-stone-700"
                aria-label="Remove item"
              >
                ×
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              <MacroInput
                label="P"
                value={item.proteinG || ''}
                onChange={(v) => updateItem(index, 'proteinG', v)}
              />
              <MacroInput
                label="C"
                value={item.carbsG || ''}
                onChange={(v) => updateItem(index, 'carbsG', v)}
              />
              <MacroInput
                label="F"
                value={item.fatG || ''}
                onChange={(v) => updateItem(index, 'fatG', v)}
              />
            </div>
          </div>
        ))}
      </div>

      {!usingItems && (
        <div className="space-y-2 rounded-xl bg-teal-50/70 p-3 dark:bg-teal-950/40">
          <p className="text-sm font-medium text-teal-900 dark:text-teal-200">Plate totals</p>
          <p className="text-xs text-teal-800/80 dark:text-teal-300/80">
            No food items filled — enter nutrition for the whole plate.
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <label className="block text-sm">
              <span className="mb-1 block text-stone-600 dark:text-stone-300">kcal</span>
              <input
                type="number"
                min={0}
                value={plateCalories}
                onChange={(e) => setPlateCalories(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-50"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-stone-600 dark:text-stone-300">Protein</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={plateProtein}
                onChange={(e) => setPlateProtein(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-50"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-stone-600 dark:text-stone-300">Carbs</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={plateCarbs}
                onChange={(e) => setPlateCarbs(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-50"
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block text-stone-600 dark:text-stone-300">Fat</span>
              <input
                type="number"
                min={0}
                step={0.1}
                value={plateFat}
                onChange={(e) => setPlateFat(e.target.value)}
                className="w-full rounded-lg border border-stone-300 bg-white px-2 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-50"
              />
            </label>
          </div>
        </div>
      )}

      <label className="block text-sm">
        <span className="mb-1 block text-stone-600 dark:text-stone-300">Note (optional)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. ate out with friends"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
        />
      </label>

      {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

      <div className="flex items-center justify-between border-t border-stone-100 pt-3 dark:border-stone-800">
        <div className="text-sm text-stone-600 dark:text-stone-300">
          <strong className="text-stone-900 dark:text-stone-50">
            {Math.round(displayTotals.calories)} kcal
          </strong>
          <span className="ml-2 text-xs text-stone-500 dark:text-stone-400">
            P {roundMacro(displayTotals.proteinG)} · C {roundMacro(displayTotals.carbsG)} · F{' '}
            {roundMacro(displayTotals.fatG)}
          </span>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : initial ? 'Save changes' : 'Save meal'}
        </button>
      </div>
    </form>
  )
}

function MacroInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: string | number
  onChange: (value: string) => void
}) {
  return (
    <label className="block text-xs">
      <span className="mb-1 block text-stone-500">{label} (g)</span>
      <input
        type="number"
        min={0}
        step={0.1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-50"
      />
    </label>
  )
}
