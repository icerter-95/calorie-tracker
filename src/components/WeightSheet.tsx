/**
 * Log / edit a weight entry. Same composer grammar as MealForm: fields scroll,
 * Save sits in the ActionBar, Delete sits far left, and the sheet owns dismiss.
 */
import { useId, useState } from 'react'
import type { WeightEntry } from '../types'
import { todayKey } from '../lib/dates'
import ActionBar from './ui/ActionBar'
import Button from './ui/Button'
import Field, { fieldInputClass } from './ui/Field'
import Sheet from './ui/Sheet'

export interface WeightPayload {
  date: string
  weightKg: number
}

interface WeightSheetProps {
  /** Pass an entry to edit it; omit to log a new one. */
  initial?: WeightEntry | null
  onSave: (payload: WeightPayload) => Promise<void>
  onCancel: () => void
  onDelete?: () => void | Promise<void>
}

export default function WeightSheet({ initial, onSave, onCancel, onDelete }: WeightSheetProps) {
  const formId = useId()
  const [date, setDate] = useState(initial?.date ?? todayKey())
  const [weightKg, setWeightKg] = useState(initial ? String(initial.weightKg) : '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const parsed = Number(weightKg)
    if (!parsed || parsed <= 0) {
      setError('Enter a weight above 0 kg.')
      return
    }

    setSaving(true)
    setError(null)
    try {
      await onSave({ date, weightKg: parsed })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save weight')
    } finally {
      setSaving(false)
    }
  }

  const footer = (
    <ActionBar
      destructive={
        onDelete ? (
          <Button
            variant="destructive"
            size="sm"
            disabled={saving}
            onClick={() => {
              if (!window.confirm('Delete this weight entry?')) return
              void onDelete()
            }}
          >
            Delete
          </Button>
        ) : undefined
      }
      primary={
        <Button type="submit" form={formId} disabled={saving} busy={saving} busyLabel="Saving…">
          Save
        </Button>
      }
    />
  )

  return (
    <Sheet
      ariaLabel={initial ? 'Edit weight entry' : 'Log weight'}
      title={initial ? 'Edit entry' : 'Log weight'}
      onClose={onCancel}
      closeDisabled={saving}
      footer={footer}
    >
      <form
        id={formId}
        onSubmit={handleSubmit}
        className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
      >
        <div className="space-y-3 p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Date">
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={fieldInputClass}
              />
            </Field>
            <Field label="Weight (kg)">
              <input
                type="number"
                required
                min={0}
                step={0.1}
                autoFocus
                value={weightKg}
                onChange={(e) => setWeightKg(e.target.value)}
                className={fieldInputClass}
              />
            </Field>
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
        </div>
      </form>
    </Sheet>
  )
}
