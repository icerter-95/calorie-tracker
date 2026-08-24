/**
 * Voice / typed description → Gemini plate estimate → confirm before Save.
 * Speech starts from a user gesture in the parent when available.
 */
import { useState } from 'react'
import { useKeyboardInset, useLockBodyScroll } from '../hooks/useOverlay'
import { estimatePlateFromText } from '../lib/estimateMeal'
import { roundMacro } from '../lib/macros'
import type { MealInput, MealType } from '../types'
import FavoriteToggle from './FavoriteToggle'
import MealEstimateReview from './MealEstimateReview'
import MealSlotPicker from './MealSlotPicker'

interface VoicePanelProps {
  date: string
  mealType: MealType
  onMealTypeChange: (slot: MealType) => void
  transcript: string
  onTranscriptChange: (value: string) => void
  listening: boolean
  speechAvailable: boolean
  onStartListening: () => void
  speechError?: string | null
  onCancel: () => void
  onSave: (data: MealInput, options?: { asFavorite?: boolean }) => Promise<void>
}

export default function VoicePanel({
  date,
  mealType,
  onMealTypeChange,
  transcript,
  onTranscriptChange,
  listening,
  speechAvailable,
  onStartListening,
  speechError,
  onCancel,
  onSave,
}: VoicePanelProps) {
  useLockBodyScroll()
  const keyboardInset = useKeyboardInset()
  const [description, setDescription] = useState('')
  const [calories, setCalories] = useState('')
  const [protein, setProtein] = useState('')
  const [carbs, setCarbs] = useState('')
  const [fat, setFat] = useState('')
  const [ingredients, setIngredients] = useState<string[]>([])
  const [estimated, setEstimated] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [saving, setSaving] = useState(false)
  const [asFavorite, setAsFavorite] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const busy = estimating || saving
  const canEstimate = Boolean(transcript.trim()) && !busy

  async function handleEstimate() {
    const text = transcript.trim()
    if (!text) {
      setError('Describe what you ate first.')
      return
    }
    setEstimating(true)
    setError(null)
    try {
      const result = await estimatePlateFromText(text)
      setDescription(result.description)
      setIngredients(result.ingredients)
      setCalories(result.calories ? String(result.calories) : '')
      setProtein(result.proteinG ? String(result.proteinG) : '')
      setCarbs(result.carbsG ? String(result.carbsG) : '')
      setFat(result.fatG ? String(result.fatG) : '')
      setEstimated(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not estimate meal')
    } finally {
      setEstimating(false)
    }
  }

  async function handleSave() {
    const desc = description.trim()
    const totals = {
      calories: Number(calories) || 0,
      proteinG: roundMacro(Number(protein) || 0),
      carbsG: roundMacro(Number(carbs) || 0),
      fatG: roundMacro(Number(fat) || 0),
    }

    if (!desc) {
      setError('Add a description.')
      return
    }
    if (totals.calories <= 0 && totals.proteinG <= 0 && totals.carbsG <= 0 && totals.fatG <= 0) {
      setError('Enter calories or macros.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave(
        {
          date,
          mealType,
          description: desc,
          items: [],
          ingredients,
          totalCalories: Math.round(totals.calories),
          proteinG: totals.proteinG,
          carbsG: totals.carbsG,
          fatG: totals.fatG,
        },
        { asFavorite },
      )
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save meal')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-stone-100 pt-[env(safe-area-inset-top,0px)] dark:bg-stone-950">
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-stone-200 px-4 py-2 dark:border-stone-800">
        <h2 className="text-lg font-semibold text-stone-900 dark:text-stone-50">Voice</h2>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg px-2 py-1 text-sm font-medium text-stone-600 hover:bg-stone-200 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Close
        </button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto w-full max-w-lg space-y-3">
          <MealSlotPicker value={mealType} onChange={onMealTypeChange} disabled={busy} />

          <label className="block text-sm">
            <span className="mb-1 block text-stone-600 dark:text-stone-300">
              {speechAvailable ? 'Transcript' : 'What did you eat?'}
            </span>
            <textarea
              value={transcript}
              onChange={(e) => {
                onTranscriptChange(e.target.value)
                setEstimated(false)
              }}
              disabled={busy}
              rows={4}
              placeholder={
                listening
                  ? 'Listening…'
                  : speechAvailable
                    ? 'Tap the mic, then edit if needed'
                    : 'e.g. Half a shared paella and a glass of wine'
              }
              className="w-full resize-none rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
            />
          </label>

          {speechAvailable && (
            <button
              type="button"
              onClick={onStartListening}
              disabled={busy || listening}
              className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium disabled:opacity-60 ${
                listening
                  ? 'bg-teal-700 text-white'
                  : 'bg-white text-stone-700 ring-1 ring-stone-200 hover:bg-stone-50 dark:bg-stone-900 dark:text-stone-200 dark:ring-stone-700'
              }`}
            >
              {listening ? 'Listening…' : 'Speak again'}
            </button>
          )}

          {!speechAvailable && (
            <p className="text-xs text-stone-500 dark:text-stone-400">
              Voice isn’t available here — type the meal instead.
            </p>
          )}

          {estimated && (
            <MealEstimateReview
              description={description}
              onDescriptionChange={setDescription}
              calories={calories}
              onCaloriesChange={setCalories}
              protein={protein}
              onProteinChange={setProtein}
              carbs={carbs}
              onCarbsChange={setCarbs}
              fat={fat}
              onFatChange={setFat}
              ingredients={ingredients}
              disabled={busy}
            />
          )}

          {(error || speechError) && (
            <p className="text-sm text-red-600 dark:text-red-400">{error ?? speechError}</p>
          )}
        </div>
      </div>

      <div
        className="shrink-0 border-t border-stone-200 bg-white px-4 pt-3 dark:border-stone-800 dark:bg-stone-950"
        style={{ paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px) + ${keyboardInset}px)` }}
      >
        <div className="mx-auto flex w-full max-w-lg items-center gap-2">
          <FavoriteToggle
            pressed={asFavorite}
            onToggle={() => setAsFavorite((v) => !v)}
            disabled={busy}
          />
          {estimated ? (
            <>
              <button
                type="button"
                onClick={() => void handleEstimate()}
                disabled={!canEstimate}
                className="rounded-xl px-4 py-3 text-sm font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800"
              >
                Re-estimate
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={busy}
                className="flex-1 rounded-xl bg-teal-700 py-3 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => void handleEstimate()}
              disabled={!canEstimate}
              className="flex-1 rounded-xl bg-teal-700 py-3 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {estimating ? 'Estimating…' : 'Estimate'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
