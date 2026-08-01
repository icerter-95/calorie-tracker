import { roundMacro } from '../lib/macros'

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
      <p className="text-[11px] font-medium uppercase tracking-wide text-stone-400 dark:text-stone-500">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-semibold tabular-nums text-stone-100">
        {roundMacro(current)}
        <span className="font-normal text-stone-400"> / {goal} {unit}</span>
      </p>
      <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-stone-700">
        <div
          className="h-full rounded-full bg-amber-400 transition-[width] duration-300"
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
  const barMax = Math.max(calorieGoalUpper, totalCalories, 1)
  const fillPct = Math.min(100, (totalCalories / barMax) * 100)
  const lowerPct = (calorieGoalLower / barMax) * 100
  const upperPct = (calorieGoalUpper / barMax) * 100

  const remaining = calorieGoalLower - totalCalories

  return (
    <section className="rounded-2xl bg-stone-900 p-5 text-white shadow-sm dark:bg-stone-900 dark:ring-1 dark:ring-stone-700">
      <p className="text-center text-2xl font-bold tabular-nums tracking-tight">
        {totalCalories.toLocaleString()}
        <span className="text-lg font-medium text-stone-400">
          {' '}
          / {calorieGoalLower.toLocaleString()} kcal
        </span>
      </p>
      <p className="mt-1 text-center text-xs text-stone-400">
        {remaining >= 0
          ? `${remaining.toLocaleString()} kcal left to lower goal`
          : totalCalories <= calorieGoalUpper
            ? `${(totalCalories - calorieGoalLower).toLocaleString()} kcal over lower · under maintenance`
            : `${(totalCalories - calorieGoalUpper).toLocaleString()} kcal over maintenance`}
      </p>

      <div className="relative mt-5 px-1 pb-5">
        <div className="h-2 overflow-hidden rounded-full bg-stone-700">
          <div
            className="h-full rounded-full bg-amber-400 transition-[width] duration-300"
            style={{ width: `${fillPct}%` }}
          />
        </div>

        {/* Lower milestone */}
        <div
          className="absolute top-0 -translate-x-1/2"
          style={{ left: `${lowerPct}%` }}
        >
          <div className="mx-auto h-2 w-px bg-stone-400" />
          <p className="mt-1.5 whitespace-nowrap text-center text-[10px] tabular-nums text-stone-400">
            {calorieGoalLower.toLocaleString()}
          </p>
        </div>

        {/* Upper milestone */}
        <div
          className="absolute top-0 -translate-x-1/2"
          style={{ left: `${upperPct}%` }}
        >
          <div className="mx-auto h-2 w-px bg-stone-400" />
          <p className="mt-1.5 whitespace-nowrap text-center text-[10px] tabular-nums text-stone-400">
            {calorieGoalUpper.toLocaleString()}
          </p>
        </div>
      </div>

      <div className="mt-2 flex gap-4 border-t border-stone-700/80 pt-4">
        <MacroRow label="Protein" current={totalProtein} goal={proteinGoal} />
        <MacroRow label="Carbs" current={totalCarbs} goal={carbsGoal} />
        <MacroRow label="Fats" current={totalFat} goal={fatGoal} />
      </div>
    </section>
  )
}
