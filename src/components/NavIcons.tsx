/**
 * Stroke icons for the bottom tab bar. `active` fills the shape so the
 * current tab reads without relying on colour alone.
 */

const iconProps = {
  width: 22,
  height: 22,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
}

/** Calendar — Diary is a day you log. */
export function DiaryIcon({ active = false }: { active?: boolean }) {
  return (
    <svg {...iconProps} strokeWidth={active ? 2 : 1.75}>
      <rect
        x="4.5"
        y="6.5"
        width="15"
        height="13.5"
        rx="2"
        fill={active ? 'currentColor' : 'none'}
        fillOpacity={active ? 0.15 : 0}
      />
      <path d="M8 4.75v3" />
      <path d="M16 4.75v3" />
      <path d="M4.5 10.25h15" />
      {active && (
        <>
          <path d="M9 14h.01" strokeWidth={2.4} />
          <path d="M12 14h.01" strokeWidth={2.4} />
          <path d="M15 14h.01" strokeWidth={2.4} />
        </>
      )}
    </svg>
  )
}

/** Sparkline — Progress is calories over time. */
export function ProgressIcon({ active = false }: { active?: boolean }) {
  return (
    <svg {...iconProps} strokeWidth={active ? 2 : 1.75}>
      {active && (
        <path
          d="M4 17.5 9 12.5 13 14.5 20 7.5 V17.5 Z"
          fill="currentColor"
          fillOpacity={0.15}
          stroke="none"
        />
      )}
      <path d="M4 17.5 9 12.5 13 14.5 20 7.5" />
      <path d="M15.5 7.5H20V12" />
    </svg>
  )
}

/** Pulse — Health is body signals, not a heart. */
export function HealthIcon({ active = false }: { active?: boolean }) {
  return (
    <svg {...iconProps} strokeWidth={active ? 2.15 : 1.75}>
      <path d="M3 12.5h4.2l2-5.5 3.2 11 2.4-5.5H21" />
    </svg>
  )
}
