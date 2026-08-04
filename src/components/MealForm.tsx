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
  const photoInputRef = useRef<HTMLInputElement>(null)
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

  function openPhotoPicker() {
    photoInputRef.current?.click()
  }

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
      return
    }
    // Photo: open the native sheet immediately (Take Photo / Library / Browse on iOS).
    openPhotoPicker()
  }

  function startRetake() {
    setRetaking(true)
    setFormError(null)
    openPhotoPicker()
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

  const photoInput = (
    <input
      ref={photoInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={handlePhotoPick}
    />
  )

  const photoStatus = (pickingPhoto || estimating) && (
    <span className="text-xs text-teal-700 dark:text-teal-400">
      {pickingPhoto ? 'Processing…' : 'Estimating…'}
    </span>
  )

  const slotPicker = (
    <div className="grid grid-cols-4 gap-1" role="group" aria-label="Meal slot">
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

  function detailsFields(opts?: { compact?: boolean }) {
    const compact = Boolean(opts?.compact)
    return (
      <>
        <label className="block text-sm">
          {!compact && (
            <span className="mb-1 block text-stone-600 dark:text-stone-300">Description</span>
          )}
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={compact ? 'Description' : 'e.g. Chicken rice bowl'}
            aria-label="Description"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
          />
        </label>

        <div className="grid grid-cols-4 gap-1.5">
          <NumberField label="kcal" value={plateCalories} onChange={setPlateCalories} />
          <NumberField
            label={compact ? 'P' : 'Protein'}
            value={plateProtein}
            onChange={setPlateProtein}
            step
          />
          <NumberField
            label={compact ? 'C' : 'Carbs'}
            value={plateCarbs}
            onChange={setPlateCarbs}
            step
          />
          <NumberField
            label={compact ? 'F' : 'Fat'}
            value={plateFat}
            onChange={setPlateFat}
            step
          />
        </div>

        <IngredientChips
          value={ingredients}
          onChange={setIngredients}
          onSuggest={handleSuggestTags}
          suggesting={suggestingTags}
          disabled={busy}
          hideLabel={compact}
        />

        <label className="block text-sm">
          {!compact && (
            <span className="mb-1 block text-stone-600 dark:text-stone-300">Note</span>
          )}
          <input
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={compact ? 'Note (optional)' : 'Optional'}
            aria-label="Note"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50"
          />
        </label>
      </>
    )
  }

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

  const actionFooter = (
    <div className="flex items-center justify-between gap-2 border-t border-stone-100 pt-3 dark:border-stone-800">
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
      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          className="rounded-xl px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={busy}
          className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )

  // ——— Create form ———
  if (!isEdit) {
    return (
      <form
        onSubmit={handleSubmit}
        className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700"
      >
        <h2 className="text-base font-semibold text-stone-900 dark:text-stone-50">Add entry</h2>

        {slotPicker}
        {methodPicker}

        {createMethod === 'photo' && (
          <div className="space-y-3">
            {photoPreview && (
              <div className="overflow-hidden rounded-xl ring-1 ring-stone-200 dark:ring-stone-700">
                <img src={photoPreview} alt="" className="max-h-44 w-full object-cover" />
              </div>
            )}
            {photoStatus}
            {pendingPhoto && formError && !estimating && !pickingPhoto && (
              <button
                type="button"
                disabled={busy}
                onClick={() => void runEstimate(pendingPhoto)}
                className="text-xs font-medium text-teal-700 hover:text-teal-800 disabled:opacity-60 dark:text-teal-400"
              >
                Retry estimate
              </button>
            )}
            {(hasPhoto || estimating) && detailsFields()}
          </div>
        )}

        {createMethod === 'manual' && <div className="space-y-3">{detailsFields()}</div>}

        {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

        {createMethod && actionFooter}
        {photoInput}
      </form>
    )
  }

  // ——— Edit form ———
  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Edit meal entry"
      className="overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-teal-700/25 dark:bg-stone-900 dark:ring-teal-400/30"
    >
      {photoPreview && !retaking && (
        <img src={photoPreview} alt="" className="max-h-40 w-full object-cover" />
      )}

      <div className="space-y-3 bg-stone-100/90 p-3 shadow-[inset_0_1px_2px_rgba(0,0,0,0.06)] dark:bg-stone-950/70 dark:shadow-[inset_0_1px_2px_rgba(0,0,0,0.35)]">
        <div className="flex items-center justify-between gap-2">
          {!retaking ? (
            <button
              type="button"
              disabled={busy}
              onClick={startRetake}
              className="text-xs font-medium text-teal-700 hover:text-teal-800 disabled:opacity-60 dark:text-teal-400"
            >
              {hasPhoto ? 'Retake' : 'Add photo'}
            </button>
          ) : (
            <button
              type="button"
              onClick={cancelRetake}
              className="text-xs text-stone-500 hover:text-stone-700 dark:text-stone-400"
            >
              Keep photo
            </button>
          )}
          {photoStatus}
        </div>

        {retaking && !pickingPhoto && !estimating && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={openPhotoPicker}
              className="rounded-lg bg-stone-100 px-2.5 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-200 disabled:opacity-60 dark:bg-stone-800 dark:text-stone-200 dark:hover:bg-stone-700"
            >
              Choose photo
            </button>
          </div>
        )}

        {slotPicker}
        {detailsFields({ compact: true })}

        {formError && <p className="text-sm text-red-600 dark:text-red-400">{formError}</p>}

        <div className="flex items-center justify-between gap-2 border-t border-stone-200/80 pt-2.5 dark:border-stone-800">
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
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={onCancel}
              className="rounded-xl px-4 py-2 text-sm font-medium text-stone-600 hover:bg-stone-100 disabled:opacity-60 dark:text-stone-300 dark:hover:bg-stone-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
            >
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
      {photoInput}
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
