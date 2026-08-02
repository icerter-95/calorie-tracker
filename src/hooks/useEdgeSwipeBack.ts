import { useEffect, useRef, type RefObject } from 'react'

type UseEdgeSwipeBackOptions = {
  enabled: boolean
  onBack: () => void
  /** Left-edge zone width in CSS pixels */
  edgeWidth?: number
  /** Distance required to commit the back navigation */
  commitDistance?: number
}

/**
 * iOS-style interactive edge swipe: start near the left screen edge and drag right to go back.
 * Applies translateX on `targetRef` while dragging.
 */
export function useEdgeSwipeBack(
  targetRef: RefObject<HTMLElement | null>,
  { enabled, onBack, edgeWidth = 28, commitDistance = 96 }: UseEdgeSwipeBackOptions,
) {
  const onBackRef = useRef(onBack)
  onBackRef.current = onBack

  useEffect(() => {
    if (!enabled) return

    const el = targetRef.current
    if (!el) return

    let tracking = false
    let startX = 0
    let startY = 0
    let currentX = 0
    let decided = false
    let horizontal = false

    function resetTransform(animate: boolean) {
      if (!el) return
      el.style.transition = animate ? 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)' : 'none'
      el.style.transform = 'translateX(0)'
      if (animate) {
        const clear = () => {
          el.style.transition = ''
          el.removeEventListener('transitionend', clear)
        }
        el.addEventListener('transitionend', clear)
      } else {
        el.style.transition = ''
      }
    }

    function finishBack() {
      if (!el) return
      el.style.transition = 'transform 220ms cubic-bezier(0.32, 0.72, 0, 1)'
      el.style.transform = 'translateX(100%)'
      window.setTimeout(() => {
        onBackRef.current()
        // Reset after navigation; next page mounts fresh, but clear styles anyway
        el.style.transition = 'none'
        el.style.transform = ''
      }, 200)
    }

    function onTouchStart(event: TouchEvent) {
      if (event.touches.length !== 1) return
      const touch = event.touches[0]
      if (touch.clientX > edgeWidth) return

      tracking = true
      decided = false
      horizontal = false
      startX = touch.clientX
      startY = touch.clientY
      currentX = 0
      el.style.transition = 'none'
    }

    function onTouchMove(event: TouchEvent) {
      if (!tracking) return
      const touch = event.touches[0]
      const dx = touch.clientX - startX
      const dy = touch.clientY - startY

      if (!decided) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return
        decided = true
        horizontal = Math.abs(dx) > Math.abs(dy) && dx > 0
        if (!horizontal) {
          tracking = false
          return
        }
      }

      if (!horizontal) return

      // Prevent vertical scroll / browser overscroll while swiping back
      event.preventDefault()
      currentX = Math.max(0, dx)
      el.style.transform = `translateX(${currentX}px)`
    }

    function onTouchEnd() {
      if (!tracking) return
      tracking = false

      if (!horizontal) {
        resetTransform(false)
        return
      }

      if (currentX >= commitDistance) {
        finishBack()
      } else {
        resetTransform(true)
      }
    }

    function onTouchCancel() {
      if (!tracking) return
      tracking = false
      resetTransform(true)
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true })
    el.addEventListener('touchmove', onTouchMove, { passive: false })
    el.addEventListener('touchend', onTouchEnd)
    el.addEventListener('touchcancel', onTouchCancel)

    return () => {
      el.removeEventListener('touchstart', onTouchStart)
      el.removeEventListener('touchmove', onTouchMove)
      el.removeEventListener('touchend', onTouchEnd)
      el.removeEventListener('touchcancel', onTouchCancel)
      el.style.transition = ''
      el.style.transform = ''
    }
  }, [enabled, edgeWidth, commitDistance, targetRef])
}
