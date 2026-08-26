/**
 * The one place a screen commits. Destructive far left, optional tools in the
 * middle, exactly one primary on the right. Always pinned under the scrolling
 * body — never inside it.
 *
 * Sheets and takeovers publish their keyboard overlap through
 * ActionBarInsetProvider so callers never pass insets by hand.
 */
import { createContext, useContext, type ReactNode } from 'react'

const ActionBarInsetContext = createContext(0)

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
  /** `sheet` sits on the sheet surface, `page` on the page surface. */
  tone?: 'sheet' | 'page'
}

export default function ActionBar({
  destructive,
  tools,
  primary,
  tone = 'sheet',
}: ActionBarProps) {
  const keyboardInset = useContext(ActionBarInsetContext)
  const surface =
    tone === 'sheet'
      ? 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900'
      : 'border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-950'

  return (
    <div
      className={`shrink-0 border-t px-4 pt-3 ${surface}`}
      style={{
        paddingBottom: `calc(0.75rem + env(safe-area-inset-bottom, 0px) + ${keyboardInset}px)`,
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
