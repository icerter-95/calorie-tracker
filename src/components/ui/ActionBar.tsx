/**
 * The one place a screen commits. Destructive far left, optional tools in the
 * middle, exactly one primary on the right. Always pinned under the scrolling
 * body — never inside it.
 *
 * Sheets and takeovers publish their keyboard overlap through
 * ActionBarInsetProvider so callers never pass insets by hand.
 */
import { createContext, useContext, type ReactNode } from 'react'
import { useKeyboardInset } from '../../hooks/useOverlay'

const ActionBarInsetContext = createContext(0)

/** Home-indicator padding disappears once the keyboard covers that edge. */
const KEYBOARD_COVER_PX = 24

/** Sheets pass 0 (they move themselves); takeovers pass the keyboard overlap. */
export function ActionBarInsetProvider({
  inset,
  children,
}: {
  inset: number
  children: ReactNode
}) {
  return (
    <ActionBarInsetContext.Provider value={inset}>{children}</ActionBarInsetContext.Provider>
  )
}

interface ActionBarProps {
  /** Far left. Delete and friends, never sized like the primary. */
  destructive?: ReactNode
  /** Middle. Secondary tools such as Re-estimate or the favorite toggle. */
  tools?: ReactNode
  /** Right. Exactly one primary action. */
  primary: ReactNode
}

export default function ActionBar({ destructive, tools, primary }: ActionBarProps) {
  const extraInset = useContext(ActionBarInsetContext)
  const keyboardCover = useKeyboardInset()
  const safeArea = keyboardCover > KEYBOARD_COVER_PX ? '0px' : 'env(safe-area-inset-bottom, 0px)'

  return (
    <div
      className="shrink-0 border-t border-edge bg-raised px-4 pt-3"
      style={{
        paddingBottom: `calc(0.75rem + ${safeArea} + ${extraInset}px)`,
      }}
    >
      <div className="mx-auto flex w-full max-w-lg items-center gap-2">
        {destructive}
        <div className="ml-auto flex items-center gap-2">
          {tools}
          {primary}
        </div>
      </div>
    </div>
  )
}
