/**
 * Compact + control for logging a weight. Sits on the Health / History
 * headers so the action is obvious without a "Log" label.
 *
 * The hit/layout box matches the tiny section label so Weight and Steps
 * stay aligned; the filled circle is drawn larger on top.
 */
interface AddWeightButtonProps {
  onClick: () => void
}

export default function AddWeightButton({ onClick }: AddWeightButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Log weight"
      className="group relative z-10 h-5 w-8 shrink-0"
    >
      <span className="pointer-events-none absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-health text-white shadow-sm ring-1 ring-black/5 group-hover:bg-health-hover group-active:bg-health-hover">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden>
          <path
            d="M8 3.25v9.5M3.25 8h9.5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      </span>
    </button>
  )
}
