/**
 * Viewport-fixed add controls above the tab bar, right-aligned.
 *
 * Layout: Input beside Camera; Favorites heart sits only under Camera
 * and toggles the favorites panel open/closed.
 *
 * Camera is a <label htmlFor=capture-input> so the tap opens the native
 * camera directly. onCamera only arms meal state — it must not open
 * CameraMode or the label unmounts before capture can fire.
 */
import { ADD_MEAL_CAMERA_INPUT_ID } from '../lib/addMealInputs'
import { FavoriteHeart } from './FavoriteToggle'

interface AddMealButtonsProps {
  onCamera: () => void
  onInput: () => void
  onFavoritesToggle: () => void
  /** When true, only the pressed Favorites control is shown (dismiss toggle). */
  favoritesOpen?: boolean
}

export default function AddMealButtons({
  onCamera,
  onInput,
  onFavoritesToggle,
  favoritesOpen = false,
}: AddMealButtonsProps) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 z-[60]"
      style={{ bottom: 'calc(4.25rem + env(safe-area-inset-bottom, 0px))' }}
    >
      <div className="mx-auto flex w-full max-w-lg justify-end px-4">
        {favoritesOpen ? (
          <button
            type="button"
            onClick={onFavoritesToggle}
            aria-pressed
            aria-label="Close favorites"
            className="pointer-events-auto flex h-12 w-12 items-center justify-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/25 ring-4 ring-white dark:ring-stone-950"
          >
            <FavoriteHeart filled size={22} />
          </button>
        ) : (
          <div className="pointer-events-auto grid grid-cols-[auto_4rem] items-end gap-x-3 gap-y-3">
            <button
              type="button"
              onClick={onInput}
              aria-label="Input"
              className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-stone-700 shadow-md ring-1 ring-stone-200 dark:bg-stone-900 dark:text-stone-200 dark:ring-stone-700"
            >
              <InputIcon />
            </button>

            <label
              htmlFor={ADD_MEAL_CAMERA_INPUT_ID}
              onClick={onCamera}
              aria-label="Camera"
              className="flex h-16 w-16 cursor-pointer items-center justify-center rounded-full bg-teal-700 text-white shadow-lg shadow-teal-900/25 ring-4 ring-white dark:ring-stone-950"
            >
              <CameraIcon />
            </label>

            {/* Empty cell so Favorites sits under Camera only (right column). */}
            <span aria-hidden className="block" />

            <button
              type="button"
              onClick={onFavoritesToggle}
              aria-pressed={false}
              aria-label="Favorites"
              className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-white text-teal-700 shadow-md ring-1 ring-stone-200 dark:bg-stone-900 dark:text-teal-400 dark:ring-stone-700"
            >
              <FavoriteHeart filled={false} size={20} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

function CameraIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M4.75 8.5A1.75 1.75 0 0 1 6.5 6.75h1.2l.66-1.1A1.75 1.75 0 0 1 9.86 4.75h4.28c.6 0 1.16.32 1.5.84l.66 1.16h1.2A1.75 1.75 0 0 1 19.25 8.5v8.25A1.75 1.75 0 0 1 17.5 19.5H6.5A1.75 1.75 0 0 1 4.75 16.75V8.5Z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="12.5" r="3.15" stroke="currentColor" strokeWidth="1.75" />
    </svg>
  )
}

function InputIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 8.75h14M5 12h9M5 15.25h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M16.5 14.25v5.5M13.75 17h5.5"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  )
}
