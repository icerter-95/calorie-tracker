/**
 * Diary day totals. Remaining calories lead; macros sit underneath as
 * reference, not a second headline.
 */
import { roundMacro } from '../lib/macros'

/** Map calories onto a bar where lower sits at 70% and higher at 90%. */
function calorieFillPct(calories: number, lower: number, upper: number): number {
  if (calories <= 0) return 0
  if (calories <= lower) {
    return lower > 0 ? (calories / lower) * 70 : 0
  }
  if (calories <= upper) {
    const span = Math.max(upper - lower, 1)
    return 70 + ((calories - lower) / span) * 20
  }
  const overSpan = Math.max(upper, 1)
  return Math.min(100, 90 + ((calories - upper) / overSpan) * 10)
}

interface MacroRowProps {
  label: string
  current: number
  goal: number
  unit?: string
}

/** One macro (P/C/F) with a hairline progress bar. */
function MacroRow({ label, current, goal, unit = 'g' }: MacroRowProps) {
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-medium uppercase tracking-wider text-content-faint">
        {label}
      </p>
      <p className="mt-0.5 text-sm tabular-nums text-content-muted">
        {roundMacro(current)}
        <span className="text-content-faint">
          {' '}
          / {goal} {unit}
        </span>
      </p>
      <div className="mt-1.5 h-0.5 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

interface DaySummaryCardProps {
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFat: number
  calorieGoalLower: number
  calorieGoalUpper: number
  proteinGoal: number
  carbsGoal: number
  fatGoal: number
}

export default function DaySummaryCard({
  totalCalories,
  totalProtein,
  totalCarbs,
  totalFat,
  calorieGoalLower,
  calorieGoalUpper,
  proteinGoal,
  carbsGoal,
  fatGoal,
}: DaySummaryCardProps) {
  const fillPct = calorieFillPct(totalCalories, calorieGoalLower, calorieGoalUpper)
  const remaining = calorieGoalLower - totalCalories
  const over = remaining < 0

  return (
    <section className="border-b border-line pb-5">
      <p className="text-[10px] font-medium uppercase tracking-widest text-content-muted">
        {over ? 'Over' : 'Remaining'}
      </p>
      <p className="mt-1 flex items-baseline gap-1.5">
        <span
          className={`text-[2.125rem] font-semibold tabular-nums tracking-tight ${
            over ? 'text-danger' : 'text-accent-ink'
          }`}
        >
          {Math.abs(remaining).toLocaleString()}
        </span>
        <span className="text-sm text-content-muted">{over ? 'kcal over' : 'kcal left'}</span>
      </p>

      <div className="relative mt-3.5 pb-5">
        <div className="h-1 overflow-hidden rounded-full bg-muted">
          <div
            className={`h-full rounded-full transition-[width] duration-300 ${
              over ? 'bg-danger' : 'bg-accent'
            }`}
            style={{ width: `${fillPct}%` }}
          />
        </div>

        <div className="absolute top-0 left-[70%] -translate-x-1/2">
          <div className="mx-auto h-1 w-px bg-content-faint" />
          <p className="mt-1.5 whitespace-nowrap text-center text-[10px] tabular-nums text-content-faint">
            {calorieGoalLower.toLocaleString()}
          </p>
        </div>

        <div className="absolute top-0 left-[90%] -translate-x-1/2">
          <div className="mx-auto h-1 w-px bg-content-faint" />
          <p className="mt-1.5 whitespace-nowrap text-center text-[10px] tabular-nums text-content-faint">
            {calorieGoalUpper.toLocaleString()}
          </p>
        </div>
      </div>

      <p className="text-xs tabular-nums text-content-faint">
        {totalCalories.toLocaleString()} of {calorieGoalLower.toLocaleString()} kcal
      </p>

      <div className="mt-4 flex gap-4">
        <MacroRow label="Protein" current={totalProtein} goal={proteinGoal} />
        <MacroRow label="Carbs" current={totalCarbs} goal={carbsGoal} />
        <MacroRow label="Fats" current={totalFat} goal={fatGoal} />
      </div>
    </section>
  )
}
