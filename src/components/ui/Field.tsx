/**
 * Labelled form field. Keeps every input in the app on the same label
 * placement, text size, and control styling.
 */
import type { ReactNode } from 'react'

export const fieldInputClass =
  'w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 disabled:opacity-60 dark:border-stone-600 dark:bg-stone-800 dark:text-stone-50'

interface FieldProps {
  label: ReactNode
  /** Shown under the control, e.g. units or a constraint. */
  hint?: ReactNode
  children: ReactNode
}

export default function Field({ label, hint, children }: FieldProps) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block text-stone-600 dark:text-stone-300">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-stone-500 dark:text-stone-400">{hint}</span>}
    </label>
  )
}
