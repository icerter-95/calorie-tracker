/**
 * Menu sheet for the secondary add path: Voice, Favorites, Camera roll.
 * Rows navigate straight into a flow, so there is no action bar here.
 */
import { type ReactNode } from 'react'
import { ADD_MEAL_LIBRARY_INPUT_ID } from '../lib/addMealInputs'
import Sheet from './ui/Sheet'

interface InputSheetProps {
  onVoice: () => void
  onFavorites: () => void
  onCancel: () => void
}

export default function InputSheet({ onVoice, onFavorites, onCancel }: InputSheetProps) {
  return (
    <Sheet ariaLabel="Add meal" size="auto" onClose={onCancel}>
      <div className="space-y-1 px-4 pb-5 pt-3">
        <SheetRow
          title="Voice"
          subtitle="Speak what you ate"
          onClick={onVoice}
          icon={<MicIcon />}
        />
        <SheetRow
          title="Favorites"
          subtitle="Log a saved meal"
          onClick={onFavorites}
          icon={<HeartIcon />}
        />
        <SheetRow
          title="Camera roll"
          subtitle="Choose an existing photo"
          htmlFor={ADD_MEAL_LIBRARY_INPUT_ID}
          icon={<PhotosIcon />}
        />
      </div>
    </Sheet>
  )
}

function SheetRow({
  title,
  subtitle,
  onClick,
  htmlFor,
  icon,
}: {
  title: string
  subtitle: string
  onClick?: () => void
  htmlFor?: string
  icon: ReactNode
}) {
  const className =
    'flex w-full items-center gap-3 rounded-2xl px-2 py-3 text-left hover:bg-stone-50 dark:hover:bg-stone-800'
  const body = (
    <>
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-400">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-stone-900 dark:text-stone-50">{title}</span>
        <span className="block text-xs text-stone-500 dark:text-stone-400">{subtitle}</span>
      </span>
    </>
  )

  if (htmlFor) {
    return (
      <label htmlFor={htmlFor} className={`${className} cursor-pointer`}>
        {body}
      </label>
    )
  }

  return (
    <button type="button" onClick={onClick} className={className}>
      {body}
    </button>
  )
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="9" y="3.5" width="6" height="11" rx="3" stroke="currentColor" strokeWidth="1.75" />
      <path d="M6.5 11.5a5.5 5.5 0 0 0 11 0M12 17v3.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </svg>
  )
}

function HeartIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M12 19.5s-6.5-4-6.5-8.75A3.9 3.9 0 0 1 12 8.1a3.9 3.9 0 0 1 6.5 2.65c0 4.75-6.5 8.75-6.5 8.75z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function PhotosIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.75" y="5.75" width="16.5" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="8.75" cy="10" r="1.35" fill="currentColor" />
      <path d="m7.5 16.5 3.4-3.6 2.4 2.2 2.3-2.7 3.6 4.1" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}
