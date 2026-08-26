/**
 * Add / edit meal. Always a composer sheet: fields scroll, Save lives in the
 * ActionBar, and dismissing is the sheet's job (drag, dimmer, Escape).
 * Create offers Photo (AI estimate) or Manual; edit opens with the meal filled in.
 */
import { useEffect, useId, useRef, useState } from 'react'
import { compressImage } from '../lib/compressImage'
import { estimatePlateFromPhoto, suggestIngredientsFromText } from '../lib/estimateMeal'
import { mealTextForTagSuggestion, normalizeIngredientTags } from '../lib/ingredients'
import { roundMacro } from '../lib/macros'
import { resolvePhotoUrl, uploadMealPhoto } from '../lib/mealPhotos'
import type { MealEntry, MealInput, MealType } from '../types'
import IngredientChips from './IngredientChips'
import MealSlotPicker from './MealSlotPicker'
import ActionBar from './ui/ActionBar'
import Button from './ui/Button'
import Field, { fieldInputClass } from './ui/Field'
import Sheet from './ui/Sheet'

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
  const formId = useId()
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

  // Keep fields in sync when switching which meal is being edited.
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
    if (initial || !defaultMealType) return
    setMealType(defaultMealType)
  }, [defaultMealType, initial])

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
  const showFields = isEdit || createMethod === 'manual' || hasPhoto || estimating

  function openPhotoPicker() {
    photoInputRef.current?.click()
  }

  // Compress the photo, then call the estimate-meal Edge Function.
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

  // Ask Gemini for tags from the description / note.
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

  // Upload a new photo if needed, then pass the payload to the parent page.
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

  const photoStatus = (pickingPhoto || estimating) && (
    <span className="text-xs text-accent-ink">
      {pickingPhoto ? 'Processing…' : 'Estimating…'}
    </span>
  )

  const methodPicker = (
    <div className="grid grid-cols-2 gap-1" role="group" aria-label="Entry method">
      {(
        [
          { id: 'photo' as const, label: 'Photo' },
          { id: 'manual' as const, label: 'Manual' },
        ] as const
      ).map(({ id, label }) => {
        const selected = createMethod === id
        return (
          <button
            key={id}
            type="button"
            disabled={busy}
            onClick={() => selectCreateMethod(id)}
            className={`inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-60 ${
              selected
                ? 'bg-accent text-on-accent'
                : 'bg-muted text-content-faint hover:text-content-muted'
            }`}
          >
            {label}
          </button>
        )
      })}
    </div>
  )

  const photoControls = isEdit ? (
    <div className="flex items-center justify-between gap-2">
      {!retaking ? (
        <Button variant="ghost" size="sm" disabled={busy} onClick={startRetake}>
          {hasPhoto ? 'Retake' : 'Add photo'}
        </Button>
      ) : (
        <Button variant="ghost" size="sm" onClick={cancelRetake}>
          Keep photo
        </Button>
      )}
      {photoStatus}
    </div>
  ) : (
    <div className="flex items-center justify-between gap-2">
      {methodPicker}
      {photoStatus}
    </div>
  )

  const footer = (
    <ActionBar
      destructive={
        onDelete ? (
          <Button
            variant="destructive"
            size="sm"
            disabled={busy}
            onClick={() => {
              if (!window.confirm('Delete this entry?')) return
              void onDelete()
            }}
          >
            Delete
          </Button>
        ) : undefined
      }
      primary={
        <Button
          type="submit"
          form={formId}
          disabled={busy || !showFields}
          busy={saving}
          busyLabel="Saving…"
        >
          Save
        </Button>
      }
    />
  )

  return (
    <Sheet
      ariaLabel={isEdit ? 'Edit meal entry' : 'Add meal entry'}
      title={isEdit ? 'Edit meal' : 'Add meal'}
      onClose={onCancel}
      closeDisabled={busy}
      footer={footer}
    >
      <form
        id={formId}
        onSubmit={handleSubmit}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        {photoPreview && !retaking && (
          <img src={photoPreview} alt="" className="max-h-52 w-full object-cover" />
        )}

        <div className="space-y-3 p-4">
          {photoControls}

          {isEdit && retaking && !pickingPhoto && !estimating && (
            <Button variant="secondary" size="sm" disabled={busy} onClick={openPhotoPicker}>
              Choose photo
            </Button>
          )}

          {!isEdit && pendingPhoto && formError && !estimating && !pickingPhoto && (
            <Button variant="ghost" size="sm" disabled={busy} onClick={() => void runEstimate(pendingPhoto)}>
              Retry estimate
            </Button>
          )}

          <MealSlotPicker value={mealType} onChange={setMealType} disabled={busy} />

          {showFields && (
            <>
              <Field label="Description">
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="e.g. Chicken rice bowl"
                  aria-label="Description"
                  className={fieldInputClass}
                />
              </Field>

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

              <Field label="Note">
                <input
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Optional"
                  aria-label="Note"
                  className={fieldInputClass}
                />
              </Field>
            </>
          )}

          {formError && <p className="text-sm text-danger">{formError}</p>}
        </div>

        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handlePhotoPick}
        />
      </form>
    </Sheet>
  )
}

/** Number input used for kcal / P / C / F. */
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
    <Field label={label}>
      <input
        type="number"
        min={0}
        step={step ? 0.1 : 1}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${fieldInputClass} px-1.5`}
      />
    </Field>
  )
}
