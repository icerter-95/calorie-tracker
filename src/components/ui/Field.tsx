/**
 * Labelled form field. Keeps every input in the app on the same label
 * placement, text size, and control styling.
 */
import type { ReactNode } from 'react'

export const fieldInputClass =
  'w-full rounded-lg border border-line-strong bg-field px-3 py-2 text-sm text-content disabled:opacity-60'

interface FieldProps {
  label: ReactNode
  /** Shown under the control, e.g. units or a constraint. */
  hint?: ReactNode
  children: ReactNode
}

export default function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-content-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-content-subtle">{hint}</span>}
    </label>
  )
}
