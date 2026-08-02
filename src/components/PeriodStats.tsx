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
    <div className="rounded-2xl bg-white px-3 py-3 shadow-sm ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
      <div className="grid grid-cols-3 gap-2 text-center">
        {rows.map((row) => (
          <div key={row.label} className="min-w-0">
            <p className="truncate text-3xl font-semibold tabular-nums tracking-tight text-stone-900 dark:text-stone-50">
              {row.value}
            </p>
            <p className="mt-0.5 text-xs leading-snug text-stone-500 dark:text-stone-400">
              {row.label}
            </p>
          </div>
        ))}
      </div>
      {footnote && (
        <p className="mt-2 text-center text-xs text-stone-400 dark:text-stone-500">{footnote}</p>
      )}
    </div>
  )
}
