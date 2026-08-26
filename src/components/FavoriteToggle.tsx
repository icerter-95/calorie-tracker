/**
 * Heart used to save a meal as a favorite (log review + meal detail).
 */
interface FavoriteToggleProps {
  pressed: boolean
  onToggle: () => void
  disabled?: boolean
  size?: number
}

export default function FavoriteToggle({
  pressed,
  onToggle,
  disabled,
  size = 22,
}: FavoriteToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      disabled={disabled}
      aria-pressed={pressed}
      aria-label={pressed ? 'Saved as favorite' : 'Save as favorite'}
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-xl p-2 text-accent-ink hover:bg-accent-soft disabled:opacity-60"
    >
      <FavoriteHeart filled={pressed} size={size} />
    </button>
  )
}

export function FavoriteHeart({ filled, size = 22 }: { filled: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path
        d="M12 19.5s-6.5-4-6.5-8.75A3.9 3.9 0 0 1 12 8.1a3.9 3.9 0 0 1 6.5 2.65c0 4.75-6.5 8.75-6.5 8.75z"
        fill={filled ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}
