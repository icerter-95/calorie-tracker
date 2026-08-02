type PullToRefreshIndicatorProps = {
  pullDistance: number
  refreshing: boolean
  threshold: number
}

/**
 * Spinner that sits above page content and tracks the rubber-band pull.
 * Progress rings while dragging; full spin while refreshing.
 */
export default function PullToRefreshIndicator({
  pullDistance,
  refreshing,
  threshold,
}: PullToRefreshIndicatorProps) {
  const visible = pullDistance > 0 || refreshing
  const progress = Math.min(1, pullDistance / threshold)
  const ready = refreshing || progress >= 1

  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-10 flex items-end justify-center overflow-hidden"
      style={{
        top: 0,
        height: refreshing ? threshold : pullDistance,
        opacity: visible ? 1 : 0,
        transition: refreshing ? 'height 160ms ease-out' : undefined,
      }}
      aria-hidden={!visible}
    >
      <div
        className="mb-2 flex h-8 w-8 items-center justify-center"
        style={{
          opacity: refreshing ? 1 : Math.min(1, progress * 1.35),
          transform: refreshing ? undefined : `scale(${0.65 + progress * 0.35})`,
        }}
        role="status"
        aria-live="polite"
        aria-label={refreshing ? 'Refreshing' : ready ? 'Release to refresh' : 'Pull to refresh'}
      >
        <svg
          className={`h-6 w-6 text-teal-700 dark:text-teal-400 ${refreshing ? 'ptr-spinner' : ''}`}
          viewBox="0 0 24 24"
          fill="none"
          style={
            refreshing
              ? undefined
              : { transform: `rotate(${progress * 270}deg)` }
          }
        >
          <circle
            cx="12"
            cy="12"
            r="9"
            stroke="currentColor"
            strokeWidth="2.25"
            className="opacity-20"
          />
          <path
            d="M12 3a9 9 0 0 1 9 9"
            stroke="currentColor"
            strokeWidth="2.25"
            strokeLinecap="round"
            style={
              refreshing
                ? undefined
                : { strokeDasharray: 56, strokeDashoffset: 56 - progress * 56 }
            }
          />
        </svg>
      </div>
    </div>
  )
}
