import { useState } from 'react'
import { addMeal, deleteMeal, updateMeal } from '../db'
import { useMealsForDate } from '../hooks/useData'
import { formatDisplayDate, todayKey } from '../lib/dates'
import SwipeableMealCard from '../components/SwipeableMealCard'
import MealForm from '../components/MealForm'
import type { MealEntry } from '../types'

export default function TodayPage() {
  const dateKey = todayKey()
  const meals = useMealsForDate(dateKey)
  const [showForm, setShowForm] = useState(false)
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null)

  const totalCalories = (meals ?? []).reduce((sum, m) => sum + m.totalCalories, 0)

  async function handleSave(data: {
    date: string
    mealType: MealEntry['mealType']
    items: MealEntry['items']
    note?: string
  }) {
    const totalCalories = data.items.reduce((sum, item) => sum + item.calories, 0)
    const payload = { ...data, totalCalories, createdAt: Date.now() }

    if (editingMeal?.id != null) {
      await updateMeal(editingMeal.id, { ...payload, createdAt: editingMeal.createdAt })
    } else {
      await addMeal(payload)
    }

    setShowForm(false)
    setEditingMeal(null)
  }

  function startEdit(meal: MealEntry) {
    setEditingMeal(meal)
    setShowForm(true)
  }

  async function handleDelete(id: number) {
    await deleteMeal(id)
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-teal-700 p-5 text-white shadow-sm">
        <p className="text-sm text-teal-100">{formatDisplayDate(dateKey)}</p>
        <p className="mt-1 text-3xl font-bold">{totalCalories} kcal</p>
        <p className="text-sm text-teal-100">Today's intake</p>
      </section>

      {!showForm && (
        <button
          onClick={() => {
            setEditingMeal(null)
            setShowForm(true)
          }}
          className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-teal-700 shadow-sm ring-1 ring-stone-200 hover:bg-teal-50"
        >
          + Add meal
        </button>
      )}

      {showForm && (
        <MealForm
          initial={editingMeal ?? undefined}
          defaultDate={dateKey}
          onSave={handleSave}
          onCancel={() => {
            setShowForm(false)
            setEditingMeal(null)
          }}
        />
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500">Meals</h2>
        {meals === undefined ? (
          <p className="text-sm text-stone-500">Loading…</p>
        ) : meals.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-stone-500 ring-1 ring-stone-200">
            No meals logged yet. Tap "Add meal" to start.
          </p>
        ) : (
          meals.map((meal) => (
            <SwipeableMealCard
              key={meal.id}
              meal={meal}
              onEdit={() => startEdit(meal)}
              onDelete={() => meal.id != null && handleDelete(meal.id)}
            />
          ))
        )}
      </section>
    </div>
  )
}
