import { useEffect, useMemo, useState } from 'react'
import CalorieChart from '../components/CalorieChart'
import SwipeableMealCard from '../components/SwipeableMealCard'
import MealForm from '../components/MealForm'
import { addMeal, deleteMeal, updateMeal } from '../db'
import { useAllMeals, useAllWeights } from '../hooks/useData'
import {
  buildDailySummaries,
  formatDisplayDate,
  getMonthRange,
  getWeekRange,
  sumCaloriesForDate,
} from '../lib/dates'
import type { MealEntry, MealInput } from '../types'

type Range = 'week' | 'month'

export default function HistoryPage() {
  const [range, setRange] = useState<Range>('week')
  const [showWeight, setShowWeight] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const { meals, error: mealsError, reload: reloadMeals } = useAllMeals()
  const { weights, error: weightsError } = useAllWeights()

  const dateKeys = useMemo(
    () => (range === 'week' ? getWeekRange() : getMonthRange()),
    [range],
  )

  useEffect(() => {
    setSelectedDate(null)
    setShowForm(false)
    setEditingMeal(null)
  }, [range])

  useEffect(() => {
    setShowForm(false)
    setEditingMeal(null)
  }, [selectedDate])

  const summaries = useMemo(
    () => buildDailySummaries(meals ?? [], dateKeys),
    [meals, dateKeys],
  )

  const selectedDayMeals = useMemo(() => {
    if (!selectedDate || !meals) return []
    return meals
      .filter((m) => m.date === selectedDate)
      .sort((a, b) => a.createdAt - b.createdAt)
  }, [meals, selectedDate])

  const selectedDayTotal = useMemo(() => {
    if (!selectedDate || !meals) return 0
    return sumCaloriesForDate(meals, selectedDate)
  }, [meals, selectedDate])

  const periodTotal = summaries.reduce((sum, d) => sum + d.totalCalories, 0)
  const activeDays = summaries.filter((d) => d.totalCalories > 0).length
  const average = activeDays > 0 ? Math.round(periodTotal / activeDays) : 0

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
      reloadMeals()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not save meal')
    }
  }

  function startAdd() {
    setEditingMeal(null)
    setShowForm(true)
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
      reloadMeals()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Could not delete meal')
    }
  }

  return (
    <div className="space-y-4">
      <section className="flex gap-2">
        {(['week', 'month'] as Range[]).map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={`flex-1 rounded-xl py-2 text-sm font-medium capitalize ${
              range === r
                ? 'bg-teal-700 text-white'
                : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-300 dark:ring-stone-700 dark:hover:bg-stone-800'
            }`}
          >
            This {r}
          </button>
        ))}
      </section>

      <section className="grid grid-cols-3 gap-2">
        <StatCard label="Total" value={`${periodTotal}`} unit="kcal" />
        <StatCard label="Avg / day" value={`${average}`} unit="kcal" />
        <StatCard label="Days logged" value={`${activeDays}`} unit="" />
      </section>

      <label className="flex items-center gap-2 text-sm text-stone-600 dark:text-stone-300">
        <input
          type="checkbox"
          checked={showWeight}
          onChange={(e) => setShowWeight(e.target.checked)}
          className="rounded border-stone-300 text-teal-700 focus:ring-teal-600"
        />
        Overlay weight (kg)
      </label>

      <CalorieChart
        data={summaries}
        weights={weights ?? []}
        showWeight={showWeight}
        height={range === 'month' ? 320 : 280}
        selectedDate={selectedDate}
        onDaySelect={setSelectedDate}
      />

      <p className="text-center text-xs text-stone-500 dark:text-stone-400">
        {selectedDate ? 'Selected day — tap another bar to switch' : 'Tap a bar to view meals for that day'}
      </p>

      {(mealsError || weightsError || actionError) && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {actionError ?? mealsError ?? weightsError}
        </p>
      )}

      {selectedDate && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-sm font-semibold text-stone-800 dark:text-stone-100">
              {formatDisplayDate(selectedDate)}
            </h2>
            <span className="text-sm font-medium text-teal-700 dark:text-teal-400">
              {selectedDayTotal} kcal
            </span>
          </div>

          {showForm ? (
            <MealForm
              initial={editingMeal ?? undefined}
              defaultDate={selectedDate}
              onSave={handleSave}
              onCancel={() => {
                setShowForm(false)
                setEditingMeal(null)
              }}
            />
          ) : (
            <button
              onClick={startAdd}
              className="w-full rounded-2xl bg-white py-3 text-sm font-medium text-teal-700 shadow-sm ring-1 ring-stone-200 hover:bg-teal-50 dark:bg-stone-900 dark:text-teal-400 dark:ring-stone-700 dark:hover:bg-stone-800"
            >
              + Add meal
            </button>
          )}

          {meals === undefined ? (
            <p className="text-sm text-stone-500 dark:text-stone-400">Loading…</p>
          ) : selectedDayMeals.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-sm text-stone-500 ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700">
              No meals logged on this day. Tap "Add meal" to log one.
            </p>
          ) : (
            selectedDayMeals.map((meal) => (
              <SwipeableMealCard
                key={meal.id}
                meal={meal}
                onEdit={() => startEdit(meal)}
                onDelete={() => handleDelete(meal.id)}
              />
            ))
          )}
        </section>
      )}
    </div>
  )
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
      <p className="text-xs text-stone-500 dark:text-stone-400">{label}</p>
      <p className="text-lg font-semibold text-stone-900 dark:text-stone-50">
        {value}
        {unit && (
          <span className="ml-1 text-xs font-normal text-stone-500 dark:text-stone-400">{unit}</span>
        )}
      </p>
    </div>
  )
}
