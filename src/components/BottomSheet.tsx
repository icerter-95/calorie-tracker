/**
 * Scrollable curtain from the bottom. Covers most of the viewport so the
 * page behind stays visible; drag the handle, tap the dimmed area, or
 * press Escape to close.
 */
import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { useKeyboardInset, useLockBodyScroll } from '../hooks/useOverlay'

const HEIGHT_DVH = 85

interface BottomSheetProps {
  ariaLabel: string
  title?: string
  onClose: () => void
  closeDisabled?: boolean
  children: ReactNode
}

export default function BottomSheet({
  ariaLabel,
  title,
  onClose,
  closeDisabled,
  children,
}: BottomSheetProps) {
  useLockBodyScroll()
  const keyboardInset = useKeyboardInset()
  const [entered, setEntered] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startY = useRef<number | null>(null)

  useEffect(() => {
    const id = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(id)
  }, [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !closeDisabled) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeDisabled, onClose])

  function onTouchStart(e: TouchEvent) {
    startY.current = e.touches[0].clientY
  }

  function onTouchMove(e: TouchEvent) {
    if (startY.current == null || closeDisabled) return
    setDragY(Math.max(0, e.touches[0].clientY - startY.current))
  }

  function onTouchEnd() {
    if (dragY > 80 && !closeDisabled) onClose()
    else setDragY(0)
    startY.current = null
  }

  const sheet = (
    <div className="fixed inset-0 z-50">
      <button
        type="button"
        aria-label="Dismiss"
        disabled={closeDisabled}
        onClick={onClose}
        className={`absolute inset-0 bg-black/40 transition-opacity disabled:pointer-events-none ${
          entered ? 'opacity-100' : 'opacity-0'
        }`}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={ariaLabel}
        className={`absolute inset-x-0 mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-xl dark:bg-stone-900 ${
          dragY === 0 ? 'transition-transform duration-200' : ''
        }`}
        style={{
          height: `min(${HEIGHT_DVH}dvh, calc(100dvh - ${keyboardInset}px))`,
          bottom: keyboardInset,
          transform: entered ? `translateY(${dragY}px)` : 'translateY(100%)',
        }}
      >
        <div
          className="flex shrink-0 touch-none flex-col"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="flex justify-center pt-2">
            <span className="h-1 w-10 rounded-full bg-stone-300 dark:bg-stone-600" />
          </div>
          {title && (
            <h2 className="px-4 pb-1 pt-2 text-base font-semibold text-stone-900 dark:text-stone-50">
              {title}
            </h2>
          )}
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{children}</div>
      </div>
    </div>
  )

  return createPortal(sheet, document.body)
}
