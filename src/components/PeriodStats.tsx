/**
 * Three-stat row on Progress: days logged, avg calories, avg steps.
 */
interface PeriodStatsProps {
  daysLogged: number
  avgCalories: number
  avgSteps: number | null
  /** Optional footnote under the list (e.g. custom date span). */
  footnote?: string
}

export default function PeriodStats({
  daysLogged,
  avgCalories,
  avgSteps,
  footnote,
}: PeriodStatsProps) {
  const rows = [
    {
      label: 'Days logged',
      value: String(daysLogged),
    },
    {
      label: 'Avg calories / day',
      value: avgCalories.toLocaleString(),
    },
    {
      label: 'Avg steps / day',
      value: avgSteps != null ? avgSteps.toLocaleString() : '—',
    },
  ]

  return (
    <div className="rounded-2xl bg-raised px-3 py-3 shadow-sm ring-1 ring-line">
      <div className="grid grid-cols-3 gap-2 text-center">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <p className="truncate text-3xl font-semibold tabular-nums tracking-tight text-content">
              {row.value}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-content-subtle">
              {row.label}
            </p>
          </div>
        ))}
      </div>
      {footnote && (
        <p className="mt-2 text-center text-xs text-content-faint">{footnote}</p>
      )}
    </div>
  )
}
