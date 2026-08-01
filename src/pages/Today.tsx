import { useMemo, useState } from 'react'
import { addMeal, deleteMeal, updateMeal } from '../db'
import { useMealsForDate } from '../hooks/useData'
import { useSettings } from '../hooks/useSettings'
import { formatDisplayDate, todayKey } from '../lib/dates'
import { roundMacro } from '../lib/macros'
import { defaultMealTypeForNow } from '../lib/mealTypeDefaults'
import SwipeableMealCard from '../components/SwipeableMealCard'
import MealForm from '../components/MealForm'
import type { MealEntry, MealInput, MealType } from '../types'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../types'

type AddTarget = 'top' | MealType

export default function TodayPage() {
  const dateKey = todayKey()
  const { meals, error, reload } = useMealsForDate(dateKey)
  const { settings } = useSettings()
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null)
  const [addTarget, setAddTarget] = useState<AddTarget | null>(null)
  const [defaultMealType, setDefaultMealType] = useState<MealType>(defaultMealTypeForNow)
  const [actionError, setActionError] = useState<string | null>(null)

  const totalCalories = (meals ?? []).reduce((sum, m) => sum + m.totalCalories, 0)
  const totalProtein = (meals ?? []).reduce((sum, m) => sum + m.proteinG, 0)
  const totalCarbs = (meals ?? []).reduce((sum, m) => sum + m.carbsG, 0)
  const totalFat = (meals ?? []).reduce((sum, m) => sum + m.fatG, 0)
  const goal = settings.dailyCalorieGoal
  const remaining = goal - totalCalories

  const bySlot = useMemo(() => {
    const map = Object.fromEntries(MEAL_TYPE_ORDER.map((t) => [t, [] as MealEntry[]])) as Record<
      MealType,
      MealEntry[]
    >
    for (const meal of meals ?? []) {
      map[meal.mealType].push(meal)
    }
    return map
  }, [meals])

  function closeForm() {
    setEditingMeal(null)
    setAddTarget(null)
  }

  async function handleSave(data: MealInput) {
    setActionError(null)
    try {
      if (editingMeal) {
        await updateMeal(editingMeal.id, data)
      } else {
        await addMeal(data)
      }
      closeForm()
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save meal')
    }
  }

  function startAdd(target: AddTarget = 'top') {
    setEditingMeal(null)
    setDefaultMealType(target === 'top' ? defaultMealTypeForNow() : target)
    setAddTarget(target)
  }

  function startEdit(meal: MealEntry) {
    setAddTarget(null)
    setEditingMeal(meal)
    setDefaultMealType(meal.mealType)
  }

  async function handleDelete(id: string) {
    if (!window.confirm('Delete this entry?')) return
    setActionError(null)
    try {
      if (editingMeal?.id === id) closeForm()
      await deleteMeal(id)
      reload()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete meal')
    }
  }

  const form = (
    <MealForm
      initial={editingMeal ?? undefined}
      defaultDate={dateKey}
      defaultMealType={editingMeal ? undefined : defaultMealType}
      onSave={handleSave}
      onCancel={closeForm}
    />
  )

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

      {addTarget === 'top' ? (
        form
      ) : (
        <button
          onClick={() => startAdd('top')}
          className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-teal-700 shadow-sm ring-1 ring-stone-200 hover:bg-teal-50 dark:bg-stone-900 dark:text-teal-400 dark:ring-stone-700 dark:hover:bg-stone-800"
        >
          + Add entry
        </button>
      )}

      {meals === undefined ? (
        <p className="text-sm text-stone-500 dark:text-stone-400">Loading…</p>
      ) : (
        <div className="space-y-4">
          {MEAL_TYPE_ORDER.map((slot) => {
            const slotMeals = bySlot[slot]
            const slotKcal = slotMeals.reduce((s, m) => s + m.totalCalories, 0)
            const isMain = slot !== 'snack'
            const empty = slotMeals.length === 0
            const addingHere = addTarget === slot

            return (
              <section key={slot} className="space-y-2">
                <div className="flex items-baseline justify-between px-1">
                  <h2 className="text-sm font-semibold uppercase tracking-wide text-stone-500 dark:text-stone-400">
                    {MEAL_TYPE_LABELS[slot]}
                  </h2>
                  {!empty && (
                    <span className="text-xs font-medium text-stone-500 dark:text-stone-400">
                      {slotKcal} kcal
                    </span>
                  )}
                </div>

                {empty ? (
                  addingHere ? (
                    form
                  ) : (
                    <div className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
                      <p className="text-sm text-stone-500 dark:text-stone-400">
                        {isMain ? 'Not logged' : 'No snacks yet'}
                      </p>
                      <button
                        type="button"
                        onClick={() => startAdd(slot)}
                        className="text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
                      >
                        + Add
                      </button>
                    </div>
                  )
                ) : (
                  <>
                    {slotMeals.map((meal) => (
                      <div key={meal.id} className="space-y-2">
                        <SwipeableMealCard
                          meal={meal}
                          hideMealType
                          onEdit={() => startEdit(meal)}
                          onDelete={() => handleDelete(meal.id)}
                        />
                        {editingMeal?.id === meal.id && form}
                      </div>
                    ))}
                    {addingHere ? (
                      form
                    ) : (
                      <button
                        type="button"
                        onClick={() => startAdd(slot)}
                        className="w-full rounded-xl py-2 text-sm font-medium text-teal-700 hover:bg-teal-50 dark:text-teal-400 dark:hover:bg-stone-900"
                      >
                        + Add {MEAL_TYPE_LABELS[slot].toLowerCase()}
                      </button>
                    )}
                  </>
                )}
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
