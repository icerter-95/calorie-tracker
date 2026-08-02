import { useState } from 'react'
import { useSettings } from '../../hooks/useSettings'

export default function GoalsSettings() {
  const { settings, updateGoals } = useSettings()
  const [calorieLowerDraft, setCalorieLowerDraft] = useState(String(settings.calorieGoalLower))
  const [calorieUpperDraft, setCalorieUpperDraft] = useState(String(settings.calorieGoalUpper))
  const [proteinDraft, setProteinDraft] = useState(String(settings.proteinGoal))
  const [carbsDraft, setCarbsDraft] = useState(String(settings.carbsGoal))
  const [fatDraft, setFatDraft] = useState(String(settings.fatGoal))
  const [goalSaved, setGoalSaved] = useState(false)
  const [goalError, setGoalError] = useState<string | null>(null)
  const [editingGoals, setEditingGoals] = useState(false)

  function resetGoalDrafts() {
    setCalorieLowerDraft(String(settings.calorieGoalLower))
    setCalorieUpperDraft(String(settings.calorieGoalUpper))
    setProteinDraft(String(settings.proteinGoal))
    setCarbsDraft(String(settings.carbsGoal))
    setFatDraft(String(settings.fatGoal))
    setGoalError(null)
  }

  function startEditGoals() {
    resetGoalDrafts()
    setEditingGoals(true)
  }

  function cancelEditGoals() {
    resetGoalDrafts()
    setEditingGoals(false)
  }

  function handleGoalsSave() {
    const lower = Math.round(Number(calorieLowerDraft))
    const upper = Math.round(Number(calorieUpperDraft))
    const protein = Math.round(Number(proteinDraft))
    const carbs = Math.round(Number(carbsDraft))
    const fat = Math.round(Number(fatDraft))

    if (!lower || lower < 800 || lower > 6000 || !upper || upper < 800 || upper > 6000) {
      setGoalError('Calories must be between 800 and 6000 kcal')
      return
    }
    if (
      !protein ||
      protein < 1 ||
      protein > 1000 ||
      !carbs ||
      carbs < 1 ||
      carbs > 1000 ||
      !fat ||
      fat < 1 ||
      fat > 1000
    ) {
      setGoalError('Macros must be between 1 and 1000 g')
      return
    }

    const calorieLower = Math.min(lower, upper)
    const calorieUpper = Math.max(lower, upper)
    updateGoals({
      calorieGoalLower: calorieLower,
      calorieGoalUpper: calorieUpper,
      proteinGoal: protein,
      carbsGoal: carbs,
      fatGoal: fat,
    })
    setCalorieLowerDraft(String(calorieLower))
    setCalorieUpperDraft(String(calorieUpper))
    setProteinDraft(String(protein))
    setCarbsDraft(String(carbs))
    setFatDraft(String(fat))
    setGoalError(null)
    setEditingGoals(false)
    setGoalSaved(true)
    window.setTimeout(() => setGoalSaved(false), 1500)
  }

  return (
    <div className="space-y-2">
      <div className="space-y-2 rounded-2xl bg-white px-3 py-2.5 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-stone-800 dark:text-stone-100">Calories</p>
          <div className="flex items-center gap-2">
            {goalSaved && (
              <span className="text-xs font-medium text-teal-700 dark:text-teal-400">Saved</span>
            )}
            {!editingGoals && (
              <button
                type="button"
                onClick={startEditGoals}
                className="rounded-lg px-2 py-0.5 text-sm text-stone-600 hover:bg-stone-100 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Edit
              </button>
            )}
          </div>
        </div>

        {editingGoals ? (
          <>
            <div className="grid grid-cols-2 gap-2">
              <label className="block text-sm">
                <span className="mb-0.5 block text-xs text-stone-600 dark:text-stone-300">
                  Lower goal
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={800}
                    max={6000}
                    step={50}
                    autoFocus
                    value={calorieLowerDraft}
                    onChange={(e) => setCalorieLowerDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGoalsSave()
                      if (e.key === 'Escape') cancelEditGoals()
                    }}
                    className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
                  />
                  <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">kcal</span>
                </div>
              </label>

              <label className="block text-sm">
                <span className="mb-0.5 block text-xs text-stone-600 dark:text-stone-300">
                  Higher limit
                </span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={800}
                    max={6000}
                    step={50}
                    value={calorieUpperDraft}
                    onChange={(e) => setCalorieUpperDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleGoalsSave()
                      if (e.key === 'Escape') cancelEditGoals()
                    }}
                    className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
                  />
                  <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">kcal</span>
                </div>
              </label>
            </div>

            <p className="truncate text-xs text-stone-500 dark:text-stone-400">
              Limits set diary dot colors
            </p>

            <div className="border-t border-stone-200 pt-2 dark:border-stone-700">
              <p className="mb-1.5 text-sm font-medium text-stone-800 dark:text-stone-100">Macros</p>
              <div className="grid grid-cols-3 gap-2">
                <label className="block text-sm">
                  <span className="mb-0.5 block text-xs text-stone-600 dark:text-stone-300">
                    Protein
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      step={5}
                      value={proteinDraft}
                      onChange={(e) => setProteinDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGoalsSave()
                        if (e.key === 'Escape') cancelEditGoals()
                      }}
                      className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
                    />
                    <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">g</span>
                  </div>
                </label>
                <label className="block text-sm">
                  <span className="mb-0.5 block text-xs text-stone-600 dark:text-stone-300">
                    Carbs
                  </span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      step={5}
                      value={carbsDraft}
                      onChange={(e) => setCarbsDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGoalsSave()
                        if (e.key === 'Escape') cancelEditGoals()
                      }}
                      className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
                    />
                    <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">g</span>
                  </div>
                </label>
                <label className="block text-sm">
                  <span className="mb-0.5 block text-xs text-stone-600 dark:text-stone-300">Fat</span>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={1000}
                      step={5}
                      value={fatDraft}
                      onChange={(e) => setFatDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleGoalsSave()
                        if (e.key === 'Escape') cancelEditGoals()
                      }}
                      className="w-full rounded-lg border border-stone-300 bg-white px-2 py-1.5 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
                    />
                    <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">g</span>
                  </div>
                </label>
              </div>
            </div>

            {goalError && (
              <p className="text-xs text-red-600 dark:text-red-400">{goalError}</p>
            )}

            <div className="flex justify-end gap-1.5 border-t border-stone-200 pt-2 dark:border-stone-700">
              <button
                type="button"
                onClick={cancelEditGoals}
                className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-stone-500 hover:bg-stone-100 dark:text-stone-400 dark:hover:bg-stone-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleGoalsSave}
                className="rounded-lg bg-teal-700 px-2.5 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
              >
                Save
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-stone-600 dark:text-stone-300">Lower goal</p>
                <p className="font-medium text-stone-900 dark:text-stone-50">
                  {settings.calorieGoalLower.toLocaleString()}{' '}
                  <span className="font-normal text-stone-500 dark:text-stone-400">kcal</span>
                </p>
              </div>
              <div>
                <p className="text-xs text-stone-600 dark:text-stone-300">Higher limit</p>
                <p className="font-medium text-stone-900 dark:text-stone-50">
                  {settings.calorieGoalUpper.toLocaleString()}{' '}
                  <span className="font-normal text-stone-500 dark:text-stone-400">kcal</span>
                </p>
              </div>
            </div>

            <p className="truncate text-xs text-stone-500 dark:text-stone-400">
              Limits set diary dot colors
            </p>

            <div className="border-t border-stone-200 pt-2 dark:border-stone-700">
              <p className="mb-1.5 text-sm font-medium text-stone-800 dark:text-stone-100">Macros</p>
              <div className="grid grid-cols-3 gap-2 text-sm">
                <div>
                  <p className="text-xs text-stone-600 dark:text-stone-300">Protein</p>
                  <p className="font-medium text-stone-900 dark:text-stone-50">
                    {settings.proteinGoal}{' '}
                    <span className="font-normal text-stone-500 dark:text-stone-400">g</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-600 dark:text-stone-300">Carbs</p>
                  <p className="font-medium text-stone-900 dark:text-stone-50">
                    {settings.carbsGoal}{' '}
                    <span className="font-normal text-stone-500 dark:text-stone-400">g</span>
                  </p>
                </div>
                <div>
                  <p className="text-xs text-stone-600 dark:text-stone-300">Fat</p>
                  <p className="font-medium text-stone-900 dark:text-stone-50">
                    {settings.fatGoal}{' '}
                    <span className="font-normal text-stone-500 dark:text-stone-400">g</span>
                  </p>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
