import type { StepsEntry } from '../types'

function formatSyncLabel(ts?: number) {
  if (!ts) return null
  return new Date(ts).toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

interface StepsSnapshotProps {
  entry: StepsEntry | null | undefined
  /** When true, emphasize that today's total may be incomplete. */
  isToday?: boolean
}

/** Plain steps readout — not a live progress bar (sync is batch, not continuous). */
export default function StepsSnapshot({ entry, isToday = false }: StepsSnapshotProps) {
  if (entry === undefined) {
    return (
      <div className="rounded-2xl bg-white px-4 py-3 text-sm text-stone-500 ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700">
        Loading steps…
      </div>
    )
  }

  if (!entry) {
    return (
      <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
        <p className="text-sm font-medium text-stone-800 dark:text-stone-100">Steps</p>
        <p className="mt-0.5 text-sm text-stone-500 dark:text-stone-400">
          No sync for this day yet
        </p>
      </div>
    )
  }

  const syncLabel = formatSyncLabel(entry.syncedAt)

  return (
    <div className="rounded-2xl bg-white px-4 py-3 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm font-medium text-stone-800 dark:text-stone-100">Steps</p>
        <p className="text-lg font-semibold tabular-nums text-stone-900 dark:text-stone-50">
          {entry.steps.toLocaleString()}
        </p>
      </div>
      <p className="mt-1 text-xs text-stone-500 dark:text-stone-400">
        {isToday
          ? syncLabel
            ? `Snapshot as of ${syncLabel} · not live`
            : 'Synced from Apple Health · not live'
          : syncLabel
            ? `Synced ${syncLabel}`
            : 'From Apple Health'}
      </p>
    </div>
  )
}
