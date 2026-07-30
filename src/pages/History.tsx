import { useEffect, useMemo, useState } from 'react'
import CalorieChart from '../components/CalorieChart'
import MealCard from '../components/MealCard'
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
import type { MealEntry } from '../types'

type Range = 'week' | 'month'

export default function HistoryPage() {
  const [range, setRange] = useState<Range>('week')
  const [showWeight, setShowWeight] = useState(true)
  const [selectedDate, setSelectedDate] = useState<string | null>(null)
  const [editingMeal, setEditingMeal] = useState<MealEntry | null>(null)
  const meals = useAllMeals()
  const weights = useAllWeights()

  const dateKeys = useMemo(
    () => (range === 'week' ? getWeekRange() : getMonthRange()),
    [range],
  )

  useEffect(() => {
    setSelectedDate(null)
  }, [range])

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

    setEditingMeal(null)
  }

  async function handleDelete(id: number) {
    if (window.confirm('Delete this meal?')) {
      await deleteMeal(id)
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
                : 'bg-white text-stone-600 ring-1 ring-stone-200 hover:bg-stone-50'
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

      <label className="flex items-center gap-2 text-sm text-stone-600">
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

      <p className="text-center text-xs text-stone-500">
        {selectedDate ? 'Selected day — tap another bar to switch' : 'Tap a bar to view meals for that day'}
      </p>

      {editingMeal && (
        <MealForm
          initial={editingMeal}
          onSave={handleSave}
          onCancel={() => setEditingMeal(null)}
        />
      )}

      {selectedDate && (
        <section className="space-y-3">
          <div className="flex items-baseline justify-between px-1">
            <h2 className="text-sm font-semibold text-stone-800">
              {formatDisplayDate(selectedDate)}
            </h2>
            <span className="text-sm font-medium text-teal-700">{selectedDayTotal} kcal</span>
          </div>

          {meals === undefined ? (
            <p className="text-sm text-stone-500">Loading…</p>
          ) : selectedDayMeals.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-sm text-stone-500 ring-1 ring-stone-200">
              No meals logged on this day.
            </p>
          ) : (
            selectedDayMeals.map((meal) => (
              <MealCard
                key={meal.id}
                meal={meal}
                onEdit={() => setEditingMeal(meal)}
                onDelete={() => meal.id != null && handleDelete(meal.id)}
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
    <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200">
      <p className="text-xs text-stone-500">{label}</p>
      <p className="text-lg font-semibold text-stone-900">
        {value}
        {unit && <span className="ml-1 text-xs font-normal text-stone-500">{unit}</span>}
      </p>
    </div>
  )
}
