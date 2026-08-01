import { useEffect, useRef, useState } from 'react'
import { compressImage } from '../lib/compressImage'
import { estimatePlateFromPhoto, suggestIngredientsFromText } from '../lib/estimateMeal'
import { mealTextForTagSuggestion, normalizeIngredientTags } from '../lib/ingredients'
import { roundMacro } from '../lib/macros'
import { resolvePhotoUrl, uploadMealPhoto } from '../lib/mealPhotos'
import type { MealEntry, MealInput, MealType } from '../types'
import { MEAL_TYPE_LABELS, MEAL_TYPE_ORDER } from '../types'
import IngredientChips from './IngredientChips'

interface MealFormProps {
  initial?: MealEntry
  defaultDate?: string
  defaultMealType?: MealType
  onSave: (data: MealInput) => void | Promise<void>
  onCancel: () => void
  /** When editing, optional delete handler (confirmation is handled in the form). */
  onDelete?: () => void | Promise<void>
}

type CreateMethod = 'photo' | 'manual'

export default function MealForm({
  initial,
  defaultDate,
  defaultMealType,
  onSave,
  onCancel,
  onDelete,
}: MealFormProps) {
  const isEdit = Boolean(initial)
  const libraryInputRef = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const previewObjectUrl = useRef<string | null>(null)

  /** Create flow: which log method is selected (both buttons stay visible). */
  const [createMethod, setCreateMethod] = useState<CreateMethod | null>(null)
  const [retaking, setRetaking] = useState(false)

  const [date, setDate] = useState(initial?.date ?? defaultDate ?? '')
  const [mealType, setMealType] = useState<MealType>(
    initial?.mealType ?? defaultMealType ?? 'lunch',
  )
  const [description, setDescription] = useState(initial?.description ?? '')
  const [ingredients, setIngredients] = useState<string[]>(initial?.ingredients ?? [])
  const [plateCalories, setPlateCalories] = useState(
    initial ? String(initial.totalCalories || '') : '',
  )
  const [plateProtein, setPlateProtein] = useState(initial ? String(initial.proteinG || '') : '')
  const [plateCarbs, setPlateCarbs] = useState(initial ? String(initial.carbsG || '') : '')
  const [plateFat, setPlateFat] = useState(initial ? String(initial.fatG || '') : '')
  const [note, setNote] = useState(initial?.note ?? '')

  const [saving, setSaving] = useState(false)
  const [estimating, setEstimating] = useState(false)
  const [suggestingTags, setSuggestingTags] = useState(false)
  const [pickingPhoto, setPickingPhoto] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [storedPhotoPath, setStoredPhotoPath] = useState<string | null>(initial?.photoUrl ?? null)
  const [pendingPhoto, setPendingPhoto] = useState<Blob | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  useEffect(() => {
    if (!initial) return
    setCreateMethod(null)
    setRetaking(false)
    setDate(initial.date)
    setMealType(initial.mealType)
    setDescription(initial.description ?? '')
    setIngredients(initial.ingredients ?? [])
    setPlateCalories(String(initial.totalCalories || ''))
    setPlateProtein(String(initial.proteinG || ''))
    setPlateCarbs(String(initial.carbsG || ''))
    setPlateFat(String(initial.fatG || ''))
    setNote(initial.note ?? '')
    setStoredPhotoPath(initial.photoUrl ?? null)
    setPendingPhoto(null)
    setFormError(null)
  }, [initial])

  useEffect(() => {
    let cancelled = false

    if (pendingPhoto) {
      if (previewObjectUrl.current) {
        URL.revokeObjectURL(previewObjectUrl.current)
        previewObjectUrl.current = null
      }
      const url = URL.createObjectURL(pendingPhoto)
      previewObjectUrl.current = url
      setPhotoPreview(url)
      return () => {
        cancelled = true
      }
    }

    if (storedPhotoPath) {
      resolvePhotoUrl(storedPhotoPath)
        .then((url) => {
          if (!cancelled) setPhotoPreview(url)
        })
        .catch(() => {
          if (!cancelled) setPhotoPreview(null)
        })
    } else {
      setPhotoPreview(null)
    }

    return () => {
      cancelled = true
    }
  }, [pendingPhoto, storedPhotoPath])

  useEffect(() => {
    return () => {
      if (previewObjectUrl.current) {
        URL.revokeObjectURL(previewObjectUrl.current)
      }
    }
  }, [])

  const busy = saving || estimating || pickingPhoto || suggestingTags
  const hasPhoto = Boolean(pendingPhoto || storedPhotoPath)

  async function runEstimate(blob: Blob) {
    setEstimating(true)
    setFormError(null)
    try {
      const estimate = await estimatePlateFromPhoto(blob)
      setDescription(estimate.description)
      setIngredients(estimate.ingredients)
      setPlateCalories(estimate.calories ? String(estimate.calories) : '')
      setPlateProtein(estimate.proteinG ? String(estimate.proteinG) : '')
      setPlateCarbs(estimate.carbsG ? String(estimate.carbsG) : '')
      setPlateFat(estimate.fatG ? String(estimate.fatG) : '')
      if (!isEdit || retaking) {
        setCreateMethod('photo')
        setRetaking(false)
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not estimate meal')
      if (!isEdit) setCreateMethod('photo')
    } finally {
      setEstimating(false)
    }
  }

  async function handlePhotoPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return

    setFormError(null)
    setPickingPhoto(true)
    try {
      const compressed = await compressImage(file)
      // Retake / new photo replaces previous
      setPendingPhoto(compressed)
      setStoredPhotoPath(null)
      setPickingPhoto(false)
      await runEstimate(compressed)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not process photo')
      setPickingPhoto(false)
    }
  }

  function selectCreateMethod(method: CreateMethod) {
    setCreateMethod(method)
    setFormError(null)
    if (method === 'manual') {
      setPendingPhoto(null)
      setStoredPhotoPath(null)
    }
  }

  function startRetake() {
    setRetaking(true)
    setFormError(null)
  }

  function cancelRetake() {
    setRetaking(false)
    setPendingPhoto(null)
    setStoredPhotoPath(initial?.photoUrl ?? null)
  }

  async function handleSuggestTags() {
    setFormError(null)
    setSuggestingTags(true)
    try {
      const text = mealTextForTagSuggestion({
        description,
        items: [],
        note,
      })
      const tags = await suggestIngredientsFromText(text)
      if (tags.length === 0) {
        setFormError('No ingredient tags found — add them manually.')
        return
      }
      setIngredients(normalizeIngredientTags([...ingredients, ...tags]))
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not suggest tags')
    } finally {
      setSuggestingTags(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)

    const desc = description.trim()
    const totals = {
      calories: Number(plateCalories) || 0,
      proteinG: roundMacro(Number(plateProtein) || 0),
      carbsG: roundMacro(Number(plateCarbs) || 0),
      fatG: roundMacro(Number(plateFat) || 0),
    }

    if (!desc && !hasPhoto) {
      setFormError('Add a description or keep a photo.')
      return
    }

    if (totals.calories <= 0 && totals.proteinG <= 0 && totals.carbsG <= 0 && totals.fatG <= 0) {
      setFormError('Enter calories or macros.')
      return
    }

    setSaving(true)
    try {
      let photoUrl: string | undefined
      if (pendingPhoto) {
        photoUrl = await uploadMealPhoto(pendingPhoto)
      } else if (storedPhotoPath) {
        photoUrl = storedPhotoPath
      }

      // Preferred path: whole-meal totals. Keep prior item lines only if editing
      // and the user did not retake/replace nutrition via photo.
      const keepItems =
        isEdit && !pendingPhoto && (initial?.items?.length ?? 0) > 0 ? initial!.items : []

      await onSave({
        date,
        mealType,
        description: desc || undefined,
        photoUrl,
        items: keepItems,
        ingredients: normalizeIngredientTags(ingredients),
        totalCalories: Math.round(totals.calories),
        proteinG: roundMacro(totals.proteinG),
        carbsG: roundMacro(totals.carbsG),
        fatG: roundMacro(totals.fatG),
        note: note.trim() || undefined,
      })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Could not save meal')
    } finally {
      setSaving(false)
    }
  }

  const photoInputs = (
    <>
      <input
        ref={libraryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handlePhotoPick}
      />
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handlePhotoPick}
      />
    </>
  )

  const photoMenu = (
    <div className="flex flex-wrap items-center gap-1.5">
      <button
        type="button"
        disabled={busy}
        onClick={() => cameraInputRef.current?.click()}
        className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200 disabled:opacity-60 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
      >
        Camera
      </button>
      <button
        type="button"
        disabled={busy}
        onClick={() => libraryInputRef.current?.click()}
        className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200 disabled:opacity-60 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
      >
        Upload
      </button>
      {(pickingPhoto || estimating) && (
        <span className="text-xs text-teal-700 dark:text-teal-400">
          {pickingPhoto ? 'Processing…' : 'Estimating…'}
        </span>
      )}
    </div>
  )

  const slotPicker = (
    <div
      className="grid grid-cols-4 gap-1"
      role="group"
      aria-label="Meal slot"
    >
      {MEAL_TYPE_ORDER.map((slot) => {
        const selected = mealType === slot
        return (
          <button
            key={slot}
            type="button"
            disabled={busy}
            onClick={() => setMealType(slot)}
            className={`rounded-lg px-1 py-1.5 text-center text-xs font-medium transition-colors disabled:opacity-60 ${
              selected
                ? 'bg-teal-700 text-white'
                : 'bg-stone-100 text-stone-400 hover:text-stone-600 dark:bg-stone-800 dark:text-stone-500 dark:hover:text-stone-300'
            }`}
          >
            {MEAL_TYPE_LABELS[slot]}
          </button>
        )
      })}
    </div>
  )

  const detailsFields = (
    <>
      <label className="block text-sm">
        <span className="mb-1 block text-stone-600 dark:text-stone-300">Description</span>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="e.g. Chicken rice bowl"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
        />
      </label>

      <div className="grid grid-cols-4 gap-1.5">
        <NumberField label="kcal" value={plateCalories} onChange={setPlateCalories} />
        <NumberField label="Protein" value={plateProtein} onChange={setPlateProtein} step />
        <NumberField label="Carbs" value={plateCarbs} onChange={setPlateCarbs} step />
        <NumberField label="Fat" value={plateFat} onChange={setPlateFat} step />
      </div>

      <IngredientChips
        value={ingredients}
        onChange={setIngredients}
        onSuggest={handleSuggestTags}
        suggesting={suggestingTags}
        disabled={busy}
      />

      <label className="block text-sm">
        <span className="mb-1 block text-stone-600 dark:text-stone-300">Note</span>
        <input
          type="text"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Optional"
          className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
        />
      </label>
    </>
  )

  const methodPicker = (
    <div className="grid grid-cols-2 gap-1" role="group" aria-label="Entry method">
      {(
        [
          { id: 'photo' as const, label: 'Photo', icon: '📷' },
          { id: 'manual' as const, label: 'Manual', icon: '✏️' },
        ] as const
      ).map(({ id, label, icon }) => {
        const selected = createMethod === id
        return (
          <button
            key={id}
            type="button"
            disabled={busy}
            onClick={() => selectCreateMethod(id)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
              selected
                ? 'bg-teal-700 text-white'
                : 'bg-stone-100 text-stone-400 hover:text-stone-600 dark:bg-stone-800 dark:text-stone-500 dark:hover:text-stone-300'
            }`}
          >
            <span aria-hidden>{icon}</span>
            {label}
          </button>
        )
      })}
    </div>
  )

  // ——— Create form ———
  if (!isEdit) {
    return (
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">Add entry</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
          >
            Cancel
          </button>
        </div>

        {slotPicker}
        {methodPicker}

        {createMethod === 'photo' && (
          <div className="space-y-3">
            {photoMenu}
            {photoPreview && (
              <div className="overflow-hidden rounded-xl ring-1 ring-stone-200 dark:ring-stone-700">
                <img src={photoPreview} alt="" className="max-h-44 w-full object-cover" />
              </div>
            )}
            {(hasPhoto || estimating) && detailsFields}
          </div>
        )}

        {createMethod === 'manual' && <div className="space-y-3">{detailsFields}</div>}

        {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

        {createMethod && (createMethod === 'manual' || hasPhoto) && (
          <div className="flex justify-end border-t border-stone-100 pt-3 dark:border-stone-800">
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
        {photoInputs}
      </form>
    )
  }

  // ——— Edit form ———
  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">Edit entry</h2>
        <button
          type="button"
          onClick={onCancel}
          className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400 dark:hover:text-stone-200"
        >
          Cancel
        </button>
      </div>

      {photoPreview && !retaking && (
        <div className="overflow-hidden rounded-xl ring-1 ring-stone-200 dark:ring-stone-700">
          <img src={photoPreview} alt="" className="max-h-36 w-full object-cover" />
        </div>
      )}

      {!retaking ? (
        <button
          type="button"
          disabled={busy}
          onClick={startRetake}
          className="text-sm font-medium text-teal-700 hover:text-teal-800 dark:text-teal-400"
        >
          {hasPhoto ? 'Retake photo (re-estimate)' : 'Add photo (estimate)'}
        </button>
      ) : (
        <div className="space-y-2">
          {photoMenu}
          <button
            type="button"
            onClick={cancelRetake}
            className="text-sm text-stone-500 hover:text-stone-700 dark:text-stone-400"
          >
            Keep current photo
          </button>
        </div>
      )}

      {slotPicker}
      {detailsFields}

      {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

      <div className="flex items-center justify-between border-t border-stone-100 pt-3 dark:border-stone-800">
        {onDelete ? (
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              if (!window.confirm('Delete this entry?')) return
              void onDelete()
            }}
            className="rounded-md px-2 py-1 text-xs text-red-600 hover:bg-red-50 disabled:opacity-60 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        ) : (
          <span />
        )}
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </div>
      {photoInputs}
    </form>
  )
}

function NumberField({
  label,
  value,
  onChange,
  step,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  step?: boolean
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-stone-600 dark:text-stone-300">{label}</span>
      <input
        type="number"
        min={0}
        step={step ? 0.1 : 1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-stone-300 bg-white px-1.5 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-50"
      />
    </label>
  )
}
