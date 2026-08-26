/**
 * Quiet Diary chrome under the week strip: current logging streak and a
 * breakfast / lunch / dinner checklist for the selected day.
 */
import { MAIN_MEAL_SLOTS, MEAL_TYPE_LABELS, type MainMealSlot, type MealType } from '../types'

function FlameIcon({ lit }: { lit: boolean }) {
  const outer = lit ? 'url(#streak-flame-outer)' : 'currentColor'
  const inner = lit ? 'url(#streak-flame-inner)' : 'currentColor'

  return (
    <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden className="shrink-0">
      <defs>
        <linearGradient id="streak-flame-outer" x1="12" y1="3" x2="12" y2="21" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fb923c" />
          <stop offset="1" stopColor="#ea580c" />
        </linearGradient>
        <linearGradient id="streak-flame-inner" x1="12" y1="10" x2="12" y2="18" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde68a" />
          <stop offset="1" stopColor="#fbbf24" />
        </linearGradient>
      </defs>
      <path
        fill={outer}
        d="M15.362 5.214A8.252 8.252 0 0 1 12 21 8.25 8.25 0 0 1 6.038 7.047 8.287 8.287 0 0 0 9 9.601a8.983 8.983 0 0 1 3.361-6.867 8.21 8.21 0 0 0 3 2.48Z"
      />
      <path
        fill={inner}
        className={lit ? '' : 'opacity-40'}
        d="M12 18a3.75 3.75 0 0 0 .495-7.468 5.99 5.99 0 0 0-1.925 3.546 5.974 5.974 0 0 1-2.133-1.001A3.75 3.75 0 0 0 12 18Z"
      />
    </svg>
  )
}

function SlotMark({ logged }: { logged: boolean }) {
  if (logged) {
    return (
      <span className="flex h-4 w-4 items-center justify-center rounded-full bg-accent text-on-accent">
        <svg width="9" height="9" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M3.5 8.2 6.4 11l6.1-7"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    )
  }

  return (
    <span className="h-4 w-4 rounded-full ring-1 ring-inset ring-line-strong" />
  )
}

interface DiaryLoggingBarProps {
  /** Current streak, or null while the first load has no cache yet. */
  streak: number | null
  loggedSlots: Record<MainMealSlot, boolean>
  onSelectSlot: (slot: MealType) => void
}

export default function DiaryLoggingBar({
  streak,
  loggedSlots,
  onSelectSlot,
}: DiaryLoggingBarProps) {
  const streakActive = Boolean(streak && streak > 0)
  const streakLabel =
    streak == null ? 'Streak loading' : `${streak} ${streak === 1 ? 'day' : 'days'} logging streak`

  return (
    <div className="flex items-center justify-between gap-2 px-0.5">
      <p
        className={`flex min-w-0 items-center gap-1.5 whitespace-nowrap text-base tabular-nums ${
          streakActive
            ? 'font-semibold text-content'
            : 'text-content-faint'
        }`}
        aria-label={streakLabel}
      >
        <FlameIcon lit={streakActive} />
        {streak == null ? (
          <span className="inline-block h-3.5 w-12 rounded bg-line/80" />
        ) : (
          <span>
            {streak}
            <span className="ml-1 text-sm font-normal text-content-faint">
              {streak === 1 ? 'day' : 'days'}
            </span>
          </span>
        )}
      </p>

      <div className="flex min-w-0 shrink items-center justify-end gap-0.5">
        {MAIN_MEAL_SLOTS.map((slot) => {
          const logged = loggedSlots[slot]
          const label = MEAL_TYPE_LABELS[slot]
          return (
            <button
              key={slot}
              type="button"
              onClick={() => onSelectSlot(slot)}
              aria-label={logged ? `${label} logged` : `Add ${label.toLowerCase()}`}
              className={`flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs font-medium tracking-wide transition-colors hover:bg-hover/70 ${
                logged
                  ? 'text-content-muted'
                  : 'text-content-faint'
              }`}
            >
              <SlotMark logged={logged} />
              <span className="max-[359px]:hidden">{label}</span>
              <span className="hidden max-[359px]:inline">{label.slice(0, 1)}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
