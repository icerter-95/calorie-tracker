/**
 * Composer sheet: a curtain from the bottom for anything that edits data.
 * `tall` fills most of the viewport and scrolls with a pinned footer; `auto`
 * hugs its content and is used for short menus.
 *
 * The overlay is pinned to the visual viewport so an iPhone PWA keyboard
 * resizes the visible frame instead of shoving a position:fixed sheet away.
 *
 * Dismiss is chrome-only — drag the handle, tap the dimmer, or press Escape.
 * Screens should not add their own Cancel button.
 */
import { useEffect, useRef, useState, type ReactNode, type TouchEvent } from 'react'
import { createPortal } from 'react-dom'
import { useLockBodyScroll, useVisualViewportBox } from '../../hooks/useOverlay'
import { ActionBarInsetProvider } from './ActionBar'

const TALL_PCT = 85
const DRAG_DISMISS_PX = 80

interface SheetProps {
  ariaLabel: string
  title?: string
  onClose: () => void
  closeDisabled?: boolean
  /** Pinned under the body. Pass an ActionBar. */
  footer?: ReactNode
  size?: 'tall' | 'auto'
  children: ReactNode
}

export default function Sheet({
  ariaLabel,
  title,
  onClose,
  closeDisabled,
  footer,
  size = 'tall',
  children,
}: SheetProps) {
  useLockBodyScroll()
  const viewport = useVisualViewportBox()
  const [entered, setEntered] = useState(false)
  const [dragY, setDragY] = useState(0)
  const startY = useRef<number | null>(null)
  const isTall = size === 'tall'

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
    if (dragY > DRAG_DISMISS_PX && !closeDisabled) onClose()
    else setDragY(0)
    startY.current = null
  }

  const dragHandlers = { onTouchStart, onTouchMove, onTouchEnd }

  const grabber = (
    <div className="flex shrink-0 flex-col">
      <div className="flex justify-center pt-2">
        <span className="h-1 w-10 rounded-full bg-line-strong" />
      </div>
      {title && (
        <h2 className="px-4 pb-1 pt-2 text-base font-semibold text-content">{title}</h2>
      )}
    </div>
  )

  const sheet = (
    <div
      className="fixed z-50 overflow-hidden"
      style={{
        top: viewport.top,
        left: viewport.left,
        width: viewport.width,
        height: viewport.height,
      }}
    >
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
        className={`absolute inset-x-0 bottom-0 mx-auto flex w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-raised shadow-xl ${
          dragY === 0 ? 'transition-transform duration-200' : ''
        }`}
        style={{
          height: isTall ? `${TALL_PCT}%` : undefined,
          maxHeight: '100%',
          paddingBottom: !isTall && !footer ? 'env(safe-area-inset-bottom, 0px)' : undefined,
          transform: entered ? `translateY(${dragY}px)` : 'translateY(100%)',
        }}
      >
        <div className="touch-none" {...dragHandlers}>
          {grabber}
        </div>

        {/* Overlay is already the visual viewport, so the footer needs no inset. */}
        <ActionBarInsetProvider inset={0}>
          <div className="flex min-h-0 flex-1 flex-col">{children}</div>
          {footer}
        </ActionBarInsetProvider>
      </div>
    </div>
  )

  return createPortal(sheet, document.body)
}
