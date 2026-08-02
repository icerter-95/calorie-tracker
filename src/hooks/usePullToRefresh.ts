import { useEffect, useRef, useState, type RefObject } from 'react'

/** Visual pull distance that commits a refresh — requires a deliberate drag. */
const THRESHOLD_PX = 72
/** Cap so the rubber-band never travels endlessly. */
const MAX_PULL_PX = 108
/**
 * Damping so finger travel ≈ 2× visual distance (intentional, not a flick).
 * ~170px of real drag reaches the 72px threshold.
 */
const PULL_DAMPING = 0.42
/** Ignore left-edge starts so iOS-style back swipe can win. */
const EDGE_IGNORE_PX = 28
/** Movement before locking vertical vs horizontal. */
const AXIS_LOCK_PX = 10
/** Keep the indicator visible briefly so a fast fetch does not flash. */
const MIN_REFRESH_MS = 450

type UsePullToRefreshOptions = {
  /** Called when the user releases past the threshold. */
  onRefresh: () => void | Promise<void>
  enabled?: boolean
  /** Element that receives the rubber-band translateY. */
  contentRef: RefObject<HTMLElement | null>
}

function dampen(rawDy: number): number {
  const damped = rawDy * PULL_DAMPING
  if (damped <= MAX_PULL_PX) return damped
  // Soft clamp past the max
  const extra = damped - MAX_PULL_PX
  return MAX_PULL_PX + extra * 0.15
}

/**
 * Document-scroll pull-to-refresh: rubber-band the content when already at the top,
 * commit only after an intentional vertical pull past the threshold.
 */
export function usePullToRefresh({
  onRefresh,
  enabled = true,
  contentRef,
}: UsePullToRefreshOptions) {
  const [pullDistance, setPullDistance] = useState(0)
  const [refreshing, setRefreshing] = useState(false)

  const onRefreshRef = useRef(onRefresh)
  onRefreshRef.current = onRefresh

  const pullDistanceRef = useRef(0)
  const refreshingRef = useRef(false)

  useEffect(() => {
    if (!enabled) return

    let tracking = false
    let armed = false
    let decided = false
    let vertical = false
    let startX = 0
    let startY = 0

    function setPull(next: number) {
      pullDistanceRef.current = next
      setPullDistance(next)
      const el = contentRef.current
      if (el) {
        el.style.transform = next > 0 ? `translateY(${next}px)` : ''
      }
    }

    function setRefreshingState(next: boolean) {
      refreshingRef.current = next
      setRefreshing(next)
    }

    function atScrollTop() {
      return window.scrollY <= 0
    }

    async function runRefresh() {
      setRefreshingState(true)
      setPull(THRESHOLD_PX)
      const started = Date.now()
      try {
        await onRefreshRef.current()
      } finally {
        const elapsed = Date.now() - started
        if (elapsed < MIN_REFRESH_MS) {
          await new Promise((r) => window.setTimeout(r, MIN_REFRESH_MS - elapsed))
        }
        setRefreshingState(false)
        const el = contentRef.current
        if (el) {
          el.style.transition = 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)'
        }
        setPull(0)
        window.setTimeout(() => {
          if (el) el.style.transition = ''
        }, 240)
      }
    }

    function onTouchStart(event: TouchEvent) {
      if (refreshingRef.current) return
      if (event.touches.length !== 1) return
      const touch = event.touches[0]
      if (touch.clientX <= EDGE_IGNORE_PX) return
      if (!atScrollTop()) return

      tracking = true
      armed = false
      decided = false
      vertical = false
      startX = touch.clientX
      startY = touch.clientY
      const el = contentRef.current
      if (el) el.style.transition = 'none'
    }

    function onTouchMove(event: TouchEvent) {
      if (!tracking || refreshingRef.current) return
      const touch = event.touches[0]
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY

      if (!decided) {
        if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return
        decided = true
        // Require clearly vertical, downward intent
        vertical = dy > Math.abs(dx) * 1.15 && dy > 0
        if (!vertical) {
          tracking = false
          return
        }
        armed = atScrollTop()
      }

      if (!vertical || !armed) return

      // If the user scrolled away from the top mid-gesture, abort
      if (!atScrollTop() && pullDistanceRef.current === 0) {
        tracking = false
        return
      }

      if (dy <= 0) {
        setPull(0)
        return
      }

      // Own the gesture so the browser does not rubber-band / navigate
      event.preventDefault()
      setPull(dampen(dy))
    }

    function onTouchEnd() {
      if (!tracking) return
      tracking = false

      if (!vertical || refreshingRef.current) {
        setPull(0)
        return
      }

      const distance = pullDistanceRef.current
      if (distance >= THRESHOLD_PX) {
        void runRefresh()
        return
      }

      const el = contentRef.current
      if (el && distance > 0) {
        el.style.transition = 'transform 200ms cubic-bezier(0.32, 0.72, 0, 1)'
      }
      setPull(0)
      window.setTimeout(() => {
        if (el) el.style.transition = ''
      }, 220)
    }

    function onTouchCancel() {
      if (!tracking) return
      tracking = false
      if (!refreshingRef.current) setPull(0)
    }

    window.addEventListener('touchstart', onTouchStart, { passive: true })
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', onTouchEnd)
    window.addEventListener('touchcancel', onTouchCancel)

    return () => {
      window.removeEventListener('touchstart', onTouchStart)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('touchcancel', onTouchCancel)
      const el = contentRef.current
      if (el) {
        el.style.transition = ''
        el.style.transform = ''
      }
    }
  }, [enabled, contentRef])

  return { pullDistance, refreshing, threshold: THRESHOLD_PX }
}
