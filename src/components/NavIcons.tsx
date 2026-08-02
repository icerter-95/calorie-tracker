/** Bottom-nav icons — stroke logos that inherit `currentColor`. */

const iconProps = {
  width: 20,
  height: 20,
  viewBox: '0 0 24 24',
  fill: 'none' as const,
  stroke: 'currentColor',
  strokeWidth: 1.75,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
}

/** Clock — today’s log. */
export function DiaryIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 7.75v4.5l3.25 1.9" />
    </svg>
  )
}

/** Rising bars — progress over time. */
export function ProgressIcon() {
  return (
    <svg {...iconProps}>
      <path d="M5 18.5V12" />
      <path d="M12 18.5V6.5" />
      <path d="M19 18.5v-9" />
      <path d="M3.75 18.5h16.5" />
    </svg>
  )
}

/** Heart — health & vitals. */
export function HealthIcon() {
  return (
    <svg {...iconProps}>
      <path d="M12 19.5s-6.5-4-6.5-8.75A3.9 3.9 0 0 1 12 8.1a3.9 3.9 0 0 1 6.5 2.65c0 4.75-6.5 8.75-6.5 8.75z" />
    </svg>
  )
}
