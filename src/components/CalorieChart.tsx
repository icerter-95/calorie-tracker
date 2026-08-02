import {
  Bar,
  CartesianGrid,
  Cell,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { DailyCalorieSummary } from '../types'
import { formatShortDate } from '../lib/dates'

interface CalorieChartProps {
  data: DailyCalorieSummary[]
  weights?: { date: string; weightKg: number }[]
  showWeight?: boolean
  height?: number
  selectedDate?: string | null
  onDaySelect?: (date: string) => void
}

/** Zoom the kcal axis around logged days (~±600) so small day-to-day swings read clearly. */
function calorieAxisDomain(values: number[]): [number, number] {
  const logged = values.filter((v) => v > 0)
  if (logged.length === 0) return [0, 1200]

  const min = Math.min(...logged)
  const max = Math.max(...logged)
  const avg = logged.reduce((sum, v) => sum + v, 0) / logged.length
  const pad = 600
  const lo = Math.min(avg - pad, min)
  const hi = Math.max(avg + pad, max)
  const step = 100
  return [
    Math.max(0, Math.floor(lo / step) * step),
    Math.ceil(hi / step) * step,
  ]
}

export default function CalorieChart({
  data,
  weights = [],
  showWeight = false,
  height = 280,
  selectedDate = null,
  onDaySelect,
}: CalorieChartProps) {
  const weightByDate = Object.fromEntries(weights.map((w) => [w.date, w.weightKg]))

  const chartData = data.map((d) => ({
    ...d,
    label: formatShortDate(d.date),
    weightKg: weightByDate[d.date] ?? null,
  }))

  const calorieDomain = calorieAxisDomain(chartData.map((d) => d.totalCalories))

  if (chartData.every((d) => d.totalCalories === 0 && d.weightKg == null)) {
    return (
      <div className="flex h-40 items-center justify-center rounded-2xl bg-white text-sm text-stone-500 ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-400 dark:ring-stone-700">
        No data for this period yet.
      </div>
    )
  }

  return (
    <div className="rounded-2xl bg-white p-3 ring-1 ring-stone-200 dark:bg-stone-900 dark:ring-stone-700">
      <ResponsiveContainer width="100%" height={height}>
        <ComposedChart
          data={chartData}
          margin={{ top: 8, right: showWeight ? 16 : 8, left: 8, bottom: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e7e5e4" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval="preserveStartEnd" />
          <YAxis
            yAxisId="calories"
            domain={calorieDomain}
            allowDataOverflow
            tick={{ fontSize: 11 }}
            width={52}
            tickMargin={6}
            label={{ value: 'kcal', angle: -90, position: 'insideLeft', fontSize: 11, dx: -8 }}
          />
          {showWeight && (
            <YAxis
              yAxisId="weight"
              orientation="right"
              tick={{ fontSize: 11 }}
              width={40}
              tickMargin={6}
              domain={[70, 90]}
              ticks={[70, 75, 80, 85, 90]}
              label={{ value: 'kg', angle: 90, position: 'insideRight', fontSize: 11, dx: 8 }}
            />
          )}
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === 'totalCalories') return [`${value} kcal`, 'Calories']
              if (name === 'weightKg') return value != null ? [`${value} kg`, 'Weight'] : ['—', 'Weight']
              return [value, name]
            }}
          />
          {showWeight && <Legend wrapperStyle={{ fontSize: 12 }} />}
          <Bar
            yAxisId="calories"
            dataKey="totalCalories"
            name="Calories"
            fill="#0f766e"
            radius={[4, 4, 0, 0]}
            cursor={onDaySelect ? 'pointer' : undefined}
            onClick={
              onDaySelect
                ? (bar) => {
                    const date = bar?.payload?.date as string | undefined
                    if (date) onDaySelect(date)
                  }
                : undefined
            }
          >
            {chartData.map((entry) => (
              <Cell
                key={entry.date}
                fill={entry.date === selectedDate ? '#115e59' : '#0f766e'}
                stroke={entry.date === selectedDate ? '#042f2e' : undefined}
                strokeWidth={entry.date === selectedDate ? 1 : 0}
              />
            ))}
          </Bar>
          {showWeight && (
            <Line
              yAxisId="weight"
              type="monotone"
              dataKey="weightKg"
              name="Weight"
              stroke="#b45309"
              strokeWidth={2}
              dot={{ r: 3 }}
              connectNulls
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
