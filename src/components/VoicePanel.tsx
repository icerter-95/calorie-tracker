/**
 * Voice / typed description → Gemini plate estimate → confirm before Save.
 * Speech starts from a user gesture in the parent when available.
 */
import { useState } from 'react'
import { estimatePlateFromText } from '../lib/estimateMeal'
import { roundMacro } from '../lib/macros'
import type { MealInput, MealType } from '../types'
import FavoriteToggle from './FavoriteToggle'
import MealEstimateReview from './MealEstimateReview'
import MealSlotPicker from './MealSlotPicker'
import ActionBar from './ui/ActionBar'
import Button from './ui/Button'
import Field, { fieldInputClass } from './ui/Field'
import Takeover from './ui/Takeover'

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
      setEstimated(true)
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

  const footer = (
    <ActionBar
      tone="page"
      tools={
        <>
          <FavoriteToggle
            pressed={asFavorite}
            onToggle={() => setAsFavorite((v) => !v)}
            disabled={busy}
          />
          {estimated && (
            <Button
              variant="ghost"
              onClick={() => void handleEstimate()}
              disabled={!canEstimate}
              busy={estimating}
              busyLabel="Estimating…"
            >
              Re-estimate
            </Button>
          )}
        </>
      }
      primary={
        estimated ? (
          <Button
            onClick={() => void handleSave()}
            disabled={busy}
            busy={saving}
            busyLabel="Saving…"
          >
            Save
          </Button>
        ) : (
          <Button
            onClick={() => void handleEstimate()}
            disabled={!canEstimate}
            busy={estimating}
            busyLabel="Estimating…"
          >
            Estimate
          </Button>
        )
      }
    />
  )

  return (
    <Takeover title="Voice" onClose={onCancel} closeDisabled={saving} footer={footer}>
      <MealSlotPicker value={mealType} onChange={onMealTypeChange} disabled={busy} />

      <Field label={speechAvailable ? 'Transcript' : 'What did you eat?'}>
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
          className={`${fieldInputClass} resize-none`}
        />
      </Field>

      {speechAvailable && (
        <Button
          variant={listening ? 'primary' : 'secondary'}
          onClick={onStartListening}
          disabled={busy || listening}
        >
          {listening ? 'Listening…' : 'Speak again'}
        </Button>
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
    </Takeover>
  )
}
