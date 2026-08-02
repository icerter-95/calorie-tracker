import { useEffect } from 'react'
import { useOutletContext } from 'react-router-dom'

export type PullToRefreshOutletContext = {
  setPullToRefresh: (handler: (() => Promise<void>) | null) => void
}

/**
 * Registers a page-level refresh handler with Layout's pull-to-refresh.
 * Clears on unmount so stack/settings pages without a handler disable the gesture.
 */
export function useRegisterPullToRefresh(handler: (() => Promise<void>) | null) {
  const { setPullToRefresh } = useOutletContext<PullToRefreshOutletContext>()

  useEffect(() => {
    setPullToRefresh(handler)
    return () => setPullToRefresh(null)
  }, [handler, setPullToRefresh])
}
