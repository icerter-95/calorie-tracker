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

function MacroRow({ label, current, goal, unit = 'g' }: MacroRowProps) {
  const pct = goal > 0 ? Math.min(100, (current / goal) * 100) : 0
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[11px] font-medium uppercase tracking-wide text-teal-100/80">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-white">
        {roundMacro(current)}
        <span className="font-normal text-teal-100/80">
          {' '}
          / {goal} {unit}
        </span>
      </p>
      <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-teal-900/40">
        <div
          className="h-full rounded-full bg-white transition-[width] duration-300"
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

  return (
    <section className="rounded-2xl bg-teal-700 p-5 text-white shadow-sm">
      <p className="text-3xl font-bold tabular-nums tracking-tight">
        {totalCalories.toLocaleString()}
        <span className="text-lg font-medium text-teal-100">
          {' '}
          / {calorieGoalLower.toLocaleString()} kcal
        </span>
      </p>

      <div className="relative mt-4 pb-5">
        <div className="h-2 overflow-hidden rounded-full bg-teal-900/40">
          <div
            className="h-full rounded-full bg-white transition-[width] duration-300"
            style={{ width: `${fillPct}%` }}
          />
        </div>

        {/* Lower milestone — fixed at 70% */}
        <div className="absolute top-0 left-[70%] -translate-x-1/2">
          <div className="mx-auto h-2 w-px bg-teal-100/70" />
          <p className="mt-1.5 whitespace-nowrap text-center text-[10px] tabular-nums text-teal-100">
            {calorieGoalLower.toLocaleString()}
          </p>
        </div>

        {/* Higher milestone — fixed at 90% */}
        <div className="absolute top-0 left-[90%] -translate-x-1/2">
          <div className="mx-auto h-2 w-px bg-teal-100/70" />
          <p className="mt-1.5 whitespace-nowrap text-center text-[10px] tabular-nums text-teal-100">
            {calorieGoalUpper.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-1 flex gap-4 border-t border-teal-600/80 pt-4">
        <MacroRow label="Protein" current={totalProtein} goal={proteinGoal} />
        <MacroRow label="Carbs" current={totalCarbs} goal={carbsGoal} />
        <MacroRow label="Fats" current={totalFat} goal={fatGoal} />
      </div>
    </section>
  )
}
