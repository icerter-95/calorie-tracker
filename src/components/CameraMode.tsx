/**
 * Primary add-meal review path after a photo is chosen: preview, optional
 * comment, Estimate, then confirm totals before Save. Retake / Camera roll
 * still use the shared file inputs; the floating Camera button opens native
 * capture directly without landing here first.
 */
import { useEffect, useRef, useState } from 'react'
import { estimateMeal } from '../lib/estimateMeal'
import { ADD_MEAL_CAMERA_INPUT_ID, ADD_MEAL_LIBRARY_INPUT_ID } from '../lib/addMealInputs'
import { roundMacro } from '../lib/macros'
import { uploadMealPhoto } from '../lib/mealPhotos'
import type { MealInput, MealType } from '../types'
import FavoriteToggle from './FavoriteToggle'
import MealEstimateReview from './MealEstimateReview'
import MealSlotPicker from './MealSlotPicker'
import ActionBar from './ui/ActionBar'
import Button, { buttonClass } from './ui/Button'
import Field, { fieldInputClass } from './ui/Field'
import Takeover from './ui/Takeover'

interface CameraModeProps {
  date: string
  mealType: MealType
  onMealTypeChange: (slot: MealType) => void
  photo: Blob | null
  pickingPhoto: boolean
  processError?: string | null
  onCancel: () => void
  onSave: (data: MealInput, options?: { asFavorite?: boolean }) => Promise<void>
}

export default function CameraMode({
  date,
  mealType,
  onMealTypeChange,
  photo,
  pickingPhoto,
  processError,
  onCancel,
  onSave,
}: CameraModeProps) {
  const previewUrl = useRef<string | null>(null)

  const [preview, setPreview] = useState<string | null>(null)
  const [comment, setComment] = useState('')
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

  useEffect(() => {
    if (previewUrl.current) {
      URL.revokeObjectURL(previewUrl.current)
      previewUrl.current = null
    }
    if (!photo) {
      setPreview(null)
      setEstimated(false)
      setDescription('')
      setCalories('')
      setProtein('')
      setCarbs('')
      setFat('')
      setIngredients([])
      return
    }
    const url = URL.createObjectURL(photo)
    previewUrl.current = url
    setPreview(url)
    setEstimated(false)
    setDescription('')
    setCalories('')
    setProtein('')
    setCarbs('')
    setFat('')
    setIngredients([])
    setError(null)
    return () => {
      if (previewUrl.current) {
        URL.revokeObjectURL(previewUrl.current)
        previewUrl.current = null
      }
    }
  }, [photo])

  const busy = pickingPhoto || estimating || saving
  const canEstimate = Boolean(photo) && !busy
  const showReview = estimated || Boolean(processError)
  const canSave = showReview && !busy

  async function handleEstimate() {
    if (!photo) return
    setEstimating(true)
    setError(null)
    try {
      const result = await estimateMeal({
        image: photo,
        userNote: comment.trim() || undefined,
      })
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

    if (!desc && !photo) {
      setError('Add a description or keep a photo.')
      return
    }
    if (totals.calories <= 0 && totals.proteinG <= 0 && totals.carbsG <= 0 && totals.fatG <= 0) {
      setError('Enter calories or macros.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      const photoUrl = photo ? await uploadMealPhoto(photo) : undefined
      await onSave(
        {
          date,
          mealType,
          description: desc || undefined,
          photoUrl,
          items: [],
          ingredients,
          totalCalories: Math.round(totals.calories),
          proteinG: totals.proteinG,
          carbsG: totals.carbsG,
          fatG: totals.fatG,
          note: comment.trim() || undefined,
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
        showReview ? (
          <Button
            variant="ghost"
            onClick={() => void handleEstimate()}
            disabled={!canEstimate}
            busy={estimating}
            busyLabel="Estimating…"
          >
            Re-estimate
          </Button>
        ) : undefined
      }
      primary={
        showReview ? (
          <Button
            onClick={() => void handleSave()}
            disabled={!canSave}
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
    <Takeover title="Camera" onClose={onCancel} closeDisabled={saving} footer={footer}>
      {preview ? (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-2xl ring-1 ring-stone-200 dark:ring-stone-700">
            <img src={preview} alt="" className="max-h-64 w-full object-cover" />
          </div>
          <div className="flex justify-end">
            <FavoriteToggle
              pressed={asFavorite}
              onToggle={() => setAsFavorite((v) => !v)}
              disabled={busy}
            />
          </div>
        </div>
      ) : (
        <label
          htmlFor={ADD_MEAL_CAMERA_INPUT_ID}
          className={`flex min-h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-stone-300 bg-white px-4 py-8 text-sm text-stone-500 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-400 ${
            busy ? 'pointer-events-none opacity-60' : 'cursor-pointer'
          }`}
        >
          {pickingPhoto ? 'Processing…' : 'Take a photo or pick from camera roll'}
        </label>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <label
          htmlFor={ADD_MEAL_CAMERA_INPUT_ID}
          className={buttonClass(
            'primary',
            'md',
            busy ? 'pointer-events-none opacity-60' : 'cursor-pointer',
          )}
        >
          {preview ? 'Retake' : 'Open camera'}
        </label>
        <label
          htmlFor={ADD_MEAL_LIBRARY_INPUT_ID}
          className={buttonClass(
            'secondary',
            'md',
            busy ? 'pointer-events-none opacity-60' : 'cursor-pointer',
          )}
        >
          Camera roll
        </label>
        {(pickingPhoto || estimating) && (
          <span className="text-xs text-teal-700 dark:text-teal-400">
            {pickingPhoto ? 'Processing…' : 'Estimating…'}
          </span>
        )}
      </div>

      <MealSlotPicker value={mealType} onChange={onMealTypeChange} disabled={busy} />

      <Field
        label={
          <>
            Comment <span className="font-normal text-stone-400">(optional)</span>
          </>
        }
      >
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          disabled={busy}
          rows={2}
          placeholder="I ate half of it, only the salad, …"
          className={`${fieldInputClass} resize-none`}
        />
      </Field>

      {showReview && (
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

      {(error || processError) && (
        <p className="text-sm text-red-600 dark:text-red-400">{error ?? processError}</p>
      )}
    </Takeover>
  )
}
