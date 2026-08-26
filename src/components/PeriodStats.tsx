/**
 * Progress hero: average daily calories for the selected range, compared to
 * the lower goal. Days logged sit in the caption. Steps belong on Health.
 */
interface PeriodStatsProps {
  avgCalories: number
  daysLogged: number
  calorieGoalLower: number
  /** Optional footnote under the list (e.g. custom date span). */
  footnote?: string
}

export default function PeriodStats({
  avgCalories,
  daysLogged,
  calorieGoalLower,
  footnote,
}: PeriodStatsProps) {
  const over = calorieGoalLower > 0 && avgCalories > calorieGoalLower

  return (
    <section>
      <p className="text-[10px] font-medium uppercase tracking-widest text-content-muted">
        Daily average
      </p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span
          className={`text-[2.125rem] font-semibold tabular-nums tracking-tight ${
            over ? 'text-danger' : 'text-accent-ink'
          }`}
        >
          {avgCalories.toLocaleString()}
        </span>
        <span className="text-sm text-content-muted">kcal</span>
      </p>
      <p className="mt-1 text-xs text-content-faint">
        {daysLogged} {daysLogged === 1 ? 'day' : 'days'} logged
        {calorieGoalLower > 0 ? ` · goal ${calorieGoalLower.toLocaleString()}` : ''}
        {footnote ? ` · ${footnote}` : ''}
      </p>
    </section>
  )
}
