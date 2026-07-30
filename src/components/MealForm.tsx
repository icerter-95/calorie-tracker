import { useEffect, useState } from 'react'
import type { MealEntry, MealItem, MealType } from '../types'
import { MEAL_TYPE_LABELS } from '../types'

interface MealFormProps {
  initial?: MealEntry
  defaultDate?: string
  onSave: (data: {
    date: string
    mealType: MealType
    items: MealItem[]
    note?: string
  }) => void | Promise<void>
  onCancel: () => void
}

const emptyItem = (): MealItem => ({ name: '', calories: 0 })

export default function MealForm({ initial, defaultDate, onSave, onCancel }: MealFormProps) {
  const [date, setDate] = useState(initial?.date ?? defaultDate ?? '')
  const [mealType, setMealType] = useState<MealType>(initial?.mealType ?? 'lunch')
  const [items, setItems] = useState<MealItem[]>(
    initial?.items.length ? initial.items : [emptyItem()],
  )
  const [note, setNote] = useState(initial?.note ?? '')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (initial) {
      setDate(initial.date)
      setMealType(initial.mealType)
      setItems(initial.items.length ? initial.items : [emptyItem()])
      setNote(initial.note ?? '')
    }
  }, [initial])

  const totalCalories = items.reduce((sum, item) => sum + (Number(item.calories) || 0), 0)

  function updateItem(index: number, field: keyof MealItem, value: string | number) {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)),
    )
  }

  function addItem() {
    setItems((prev) => [...prev, emptyItem()])
  }

  function removeItem(index: number) {
    setItems((prev) => (prev.length <= 1 ? prev : prev.filter((_, i) => i !== index)))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const cleanedItems = items
      .map((item) => ({
        name: item.name.trim(),
        calories: Number(item.calories) || 0,
      }))
      .filter((item) => item.name || item.calories > 0)

    if (cleanedItems.length === 0) return

    setSaving(true)
    try {
      await onSave({
        date,
        mealType,
        items: cleanedItems,
        note: note.trim() || undefined,
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold">{initial ? 'Edit meal' : 'Add meal'}</h2>
        <button type="button" onClick={onCancel} className="text-sm text-stone-500 hover:text-stone-700">
          Cancel
        </button>
      </div>

      <div className="flex gap-3">
        <label className="flex w-0 min-w-0 flex-1 flex-col overflow-hidden text-sm">
          <span className="mb-1 text-stone-600">Date</span>
          <input
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="box-border w-full min-w-0 max-w-full rounded-lg border border-stone-300 px-2 py-2 text-sm"
          />
        </label>
        <label className="flex w-0 min-w-0 flex-1 flex-col overflow-hidden text-sm">
          <span className="mb-1 text-stone-600">Meal</span>
          <select
            value={mealType}
            onChange={(e) => setMealType(e.target.value as MealType)}
            className="box-border w-full min-w-0 max-w-full rounded-lg border border-stone-300 px-2 py-2 text-sm"
          >
            {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-stone-700">Items</span>
          <button
            type="button"
            onClick={addItem}
            className="text-sm font-medium text-teal-700 hover:text-teal-800"
          >
            + Add item
          </button>
        </div>

        {items.map((item, index) => (
          <div key={index} className="flex gap-2">
            <input
              type="text"
              placeholder="Food name"
              value={item.name}
              onChange={(e) => updateItem(index, 'name', e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <input
              type="number"
              min={0}
              placeholder="kcal"
              value={item.calories || ''}
              onChange={(e) => updateItem(index, 'calories', e.target.value)}
              className="w-24 rounded-lg border border-stone-300 px-3 py-2 text-sm"
            />
            <button
              type="button"
              onClick={() => removeItem(index)}
              className="rounded-lg px-2 text-stone-400 hover:bg-stone-100 hover:text-stone-600"
              aria-label="Remove item"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      <label className="block text-sm">
        <span className="mb-1 block text-stone-600">Note (optional)</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. ate out with friends"
          className="w-full rounded-lg border border-stone-300 px-3 py-2 text-sm"
        />
      </label>

      <div className="flex items-center justify-between border-t border-stone-100 pt-3">
        <span className="text-sm text-stone-600">
          Total: <strong className="text-stone-900">{totalCalories} kcal</strong>
        </span>
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
