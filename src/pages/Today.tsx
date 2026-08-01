import { useState } from 'react'
import { addMeal, deleteMeal, updateMeal } from '../db'
import { useMealsForDate } from '../hooks/useData'
import { useSettings } from '../hooks/useSettings'
import { formatDisplayDate, todayKey } from '../lib/dates'
import { roundMacro } from '../lib/macros'
import SwipeableMealCard from '../components/SwipeableMealCard'
import MealForm from '../components/MealForm'
import type { MealEntry, MealInput } from '../types'

export default function TodayPage() {
  const dateKey = todayKey()
  const { meals, error, reload } = useMealsForDate(dateKey)
  const { settings } = useSettings()
  const [showForm, setShowForm] = useState(false)
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const totalCalories = (meals ?? []).reduce((sum, m) => sum + m.totalCalories, 0)
  const totalProtein = (meals ?? []).reduce((sum, m) => sum + m.proteinG, 0)
  const totalCarbs = (meals ?? []).reduce((sum, m) => sum + m.carbsG, 0)
  const totalFat = (meals ?? []).reduce((sum, m) => sum + m.fatG, 0)
  const goal = settings.dailyCalorieGoal
  const remaining = goal - totalCalories

  async function handleSave(data: MealInput) {
    setActionError(null)
    try {
      if (editingMeal) {
        await updateMeal(editingMeal.id, data)
      } else {
        await addMeal(data)
      }
      setShowForm(false)
      setEditingMeal(null)
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save meal')
    }
  }

  function startEdit(meal: MealEntry) {
    setEditingMeal(meal)
    setShowForm(true)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this meal?')) return
    setActionError(null)
    try {
      await deleteMeal(id)
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete meal')
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-2xl bg-teal-700 p-5 text-white shadow-sm">
        <p className="text-sm text-teal-100">{formatDisplayDate(dateKey)}</p>
        <p className="mt-1 text-3xl font-bold">{totalCalories} kcal</p>
        <p className="text-sm text-teal-100">
          {remaining >= 0
            ? `${remaining} kcal left of ${goal}`
            : `${Math.abs(remaining)} kcal over ${goal}`}
        </p>
        <p className="mt-1 text-xs text-teal-100/90">
          P {roundMacro(totalProtein)}g · C {roundMacro(totalCarbs)}g · F {roundMacro(totalFat)}g
        </p>
      </section>

      {(error || actionError) && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {actionError ?? error}
        </p>
      )}

      {!showForm && (
        <button
          onClick={() => {
            setEditingMeal(null)
            setShowForm(true)
          }}
          className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-teal-700 shadow-sm ring-1 ring-stone-200 hover:bg-teal-50 dark:bg-stone-900 dark:text-teal-400 dark:ring-stone-700 dark:hover:bg-stone-800"
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
        <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
          Meals
        </h2>
        {meals === undefined ? (
          <p className="text-sm text-stone-500 dark:text-stone-400">Loading…</p>
        ) : meals.length === 0 ? (
          <p className="rounded-2xl bg-white p-4 text-sm text-stone-500 ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700">
            No meals logged yet. Tap "Add meal" to start.
          </p>
        ) : (
          meals.map((meal) => (
            <SwipeableMealCard
              key={meal.id}
              meal={meal}
              onEdit={() => startEdit(meal)}
              onDelete={() => handleDelete(meal.id)}
            />
          ))
        )}
      </section>
    </div>
  )
}
