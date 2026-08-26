/**
 * Goals settings. Daily calorie band (lower / upper) and protein / carbs / fat
 * targets. These drive diary dots and the day-summary bars. The page stays a
 * read-only summary; Edit opens the composer sheet.
 */
import { useId, useState } from 'react'
import Button from '../../components/ui/Button'
import ActionBar from '../../components/ui/ActionBar'
import Field, { fieldInputClass } from '../../components/ui/Field'
import Sheet from '../../components/ui/Sheet'
import { useSettings } from '../../hooks/useSettings'

export default function GoalsSettings() {
  const { settings, updateGoals } = useSettings()
  const formId = useId()
  const [editing, setEditing] = useState(false)
  const [calorieLowerDraft, setCalorieLowerDraft] = useState(String(settings.calorieGoalLower))
  const [calorieUpperDraft, setCalorieUpperDraft] = useState(String(settings.calorieGoalUpper))
  const [proteinDraft, setProteinDraft] = useState(String(settings.proteinGoal))
  const [carbsDraft, setCarbsDraft] = useState(String(settings.carbsGoal))
  const [fatDraft, setFatDraft] = useState(String(settings.fatGoal))
  const [goalSaved, setGoalSaved] = useState(false)
  const [goalError, setGoalError] = useState<string | null>(null)

  function startEdit() {
    setCalorieLowerDraft(String(settings.calorieGoalLower))
    setCalorieUpperDraft(String(settings.calorieGoalUpper))
    setProteinDraft(String(settings.proteinGoal))
    setCarbsDraft(String(settings.carbsGoal))
    setFatDraft(String(settings.fatGoal))
    setGoalError(null)
    setEditing(true)
  }

  // Validate ranges, swap lower/upper if needed, then persist locally.
  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
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

    updateGoals({
      calorieGoalLower: Math.min(lower, upper),
      calorieGoalUpper: Math.max(lower, upper),
      proteinGoal: protein,
      carbsGoal: carbs,
      fatGoal: fat,
    })
    setGoalError(null)
    setEditing(false)
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
            <Button variant="secondary" size="sm" onClick={startEdit}>
              Edit
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-sm">
          <ReadOnlyStat label="Lower goal" value={settings.calorieGoalLower.toLocaleString()} unit="kcal" />
          <ReadOnlyStat label="Higher limit" value={settings.calorieGoalUpper.toLocaleString()} unit="kcal" />
        </div>

        <p className="truncate text-xs text-stone-500 dark:text-stone-400">
          Limits set diary dot colors
        </p>

        <div className="border-t border-stone-200 pt-2 dark:border-stone-700">
          <p className="mb-1.5 text-sm font-medium text-stone-800 dark:text-stone-100">Macros</p>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <ReadOnlyStat label="Protein" value={String(settings.proteinGoal)} unit="g" />
            <ReadOnlyStat label="Carbs" value={String(settings.carbsGoal)} unit="g" />
            <ReadOnlyStat label="Fat" value={String(settings.fatGoal)} unit="g" />
          </div>
        </div>
      </div>

      {editing && (
        <Sheet
          ariaLabel="Edit goals"
          title="Edit goals"
          onClose={() => setEditing(false)}
          footer={
            <ActionBar
              primary={
                <Button type="submit" form={formId}>
                  Save
                </Button>
              }
            />
          }
        >
          <form
            id={formId}
            onSubmit={handleSubmit}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          >
            <div className="space-y-4 p-4">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Lower goal" hint="kcal">
                  <input
                    type="number"
                    min={800}
                    max={6000}
                    step={50}
                    autoFocus
                    value={calorieLowerDraft}
                    onChange={(e) => setCalorieLowerDraft(e.target.value)}
                    className={fieldInputClass}
                  />
                </Field>
                <Field label="Higher limit" hint="kcal">
                  <input
                    type="number"
                    min={800}
                    max={6000}
                    step={50}
                    value={calorieUpperDraft}
                    onChange={(e) => setCalorieUpperDraft(e.target.value)}
                    className={fieldInputClass}
                  />
                </Field>
              </div>

              <p className="text-xs text-stone-500 dark:text-stone-400">
                Limits set diary dot colors
              </p>

              <div className="grid grid-cols-3 gap-2 border-t border-stone-200 pt-3 dark:border-stone-700">
                <Field label="Protein" hint="g">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    step={5}
                    value={proteinDraft}
                    onChange={(e) => setProteinDraft(e.target.value)}
                    className={`${fieldInputClass} px-2`}
                  />
                </Field>
                <Field label="Carbs" hint="g">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    step={5}
                    value={carbsDraft}
                    onChange={(e) => setCarbsDraft(e.target.value)}
                    className={`${fieldInputClass} px-2`}
                  />
                </Field>
                <Field label="Fat" hint="g">
                  <input
                    type="number"
                    min={1}
                    max={1000}
                    step={5}
                    value={fatDraft}
                    onChange={(e) => setFatDraft(e.target.value)}
                    className={`${fieldInputClass} px-2`}
                  />
                </Field>
              </div>

              {goalError && <p className="text-sm text-red-600 dark:text-red-400">{goalError}</p>}
            </div>
          </form>
        </Sheet>
      )}
    </div>
  )
}

function ReadOnlyStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <div>
      <p className="text-xs text-stone-600 dark:text-stone-300">{label}</p>
      <p className="font-medium text-stone-900 dark:text-stone-50">
        {value} <span className="font-normal text-stone-500 dark:text-stone-400">{unit}</span>
      </p>
    </div>
  )
}
