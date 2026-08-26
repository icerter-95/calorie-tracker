/**
 * Full-screen task surface for flows that own the whole viewport: camera,
 * voice, favorites. Header carries the title and the single dismiss (Close);
 * the body scrolls; the footer holds the ActionBar.
 */
import { useEffect, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useKeyboardInset, useLockBodyScroll } from '../../hooks/useOverlay'
import { ActionBarInsetProvider } from './ActionBar'
import Button from './Button'

interface TakeoverProps {
  title: ReactNode
  onClose: () => void
  closeDisabled?: boolean
  /** Optional control before the title, e.g. back to a list step. */
  leading?: ReactNode
  /** Pinned under the body. Pass an ActionBar. */
  footer?: ReactNode
  children: ReactNode
}

export default function Takeover({
  title,
  onClose,
  closeDisabled,
  leading,
  footer,
  children,
}: TakeoverProps) {
  useLockBodyScroll()
  const keyboardInset = useKeyboardInset()

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape' && !closeDisabled) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeDisabled, onClose])

  const takeover = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex flex-col bg-surface pt-[env(safe-area-inset-top,0px)]"
    >
      <header className="flex shrink-0 items-center justify-between gap-3 border-b border-edge px-4 py-2">
        <div className="flex min-w-0 items-center gap-2">
          {leading}
          <h2 className="truncate text-lg font-semibold text-content">{title}</h2>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose} disabled={closeDisabled}>
          Close
        </Button>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
        <div className="mx-auto w-full max-w-lg space-y-3">{children}</div>
      </div>

      <ActionBarInsetProvider inset={keyboardInset}>{footer}</ActionBarInsetProvider>
    </div>
  )

  return createPortal(takeover, document.body)
}
