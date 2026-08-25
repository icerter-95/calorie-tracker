/**
 * Bottom sheet for the secondary add path: Voice and Camera roll.
 * Favorites lives on the floating toggle under Camera.
 */
import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { useLockBodyScroll } from '../hooks/useOverlay'
import { ADD_MEAL_LIBRARY_INPUT_ID } from '../lib/addMealInputs'

interface InputSheetProps {
  onVoice: () => void
  onCancel: () => void
}

export default function InputSheet({
  onVoice,
  onCancel,
}: InputSheetProps) {
  useLockBodyScroll()
  const [entered, setEntered] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  function onTouchStart(e: TouchEvent) {
    startY.current = e.touches[0].clientY
  }

  function onTouchMove(e: TouchEvent) {
    if (startY.current == null) return
    setDragY(Math.max(0, e.touches[0].clientY - startY.current))
  }

  function onTouchEnd() {
    if (dragY > 80) onCancel()
    else setDragY(0)
    startY.current = null
  }

  return (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Dismiss"
        onClick={onCancel}
        className={`absolute inset-0 bg-black/40 transition-opacity ${entered ? 'opacity-100' : 'opacity-0'}`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add meal"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        className={`absolute inset-x-0 bottom-0 mx-auto w-full max-w-lg rounded-t-3xl bg-white shadow-xl dark:bg-stone-900 ${
          dragY === 0 ? 'transition-transform duration-200' : ''
        }`}
        style={{
          transform: entered ? `translateY(${dragY}px)` : 'translateY(100%)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}
      >
        <div className="flex justify-center pt-2">
          <span className="h-1 w-10 rounded-full bg-stone-300 dark:bg-stone-600" />
        </div>

        <div className="space-y-1 px-4 pb-5 pt-3">
          <SheetRow
            title="Voice"
            subtitle="Speak what you ate"
            onClick={onVoice}
            icon={<MicIcon />}
          />
          <SheetRow
            title="Camera roll"
            subtitle="Choose an existing photo"
            htmlFor={ADD_MEAL_LIBRARY_INPUT_ID}
            icon={<PhotosIcon />}
          />
        </div>
      </div>
    </div>
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

function PhotosIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3.75" y="5.75" width="16.5" height="12.5" rx="2" stroke="currentColor" strokeWidth="1.75" />
      <circle cx="8.75" cy="10" r="1.35" fill="currentColor" />
      <path d="m7.5 16.5 3.4-3.6 2.4 2.2 2.3-2.7 3.6 4.1" stroke="currentColor" strokeWidth="1.75" strokeLinejoin="round" />
    </svg>
  )
}
