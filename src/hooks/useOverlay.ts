/**
 * Overlay helpers: lock background scroll and track keyboard overlap so
 * comment / Estimate stay visible on iOS.
 */
import { useEffect, useState } from 'react'

export function useLockBodyScroll() {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [])
}

/** Pixels the software keyboard covers at the bottom of the layout viewport. */
export function useKeyboardInset() {
  const [inset, setInset] = useState(0)

  useEffect(() => {
    const vv = window.visualViewport
    if (!vv) return

    function update() {
      const current = window.visualViewport
      if (!current) return
      const overlap = Math.max(0, window.innerHeight - current.height - current.offsetTop)
      setInset(overlap)
    }

    vv.addEventListener('resize', update)
    vv.addEventListener('scroll', update)
    update()
    return () => {
      vv.removeEventListener('resize', update)
      vv.removeEventListener('scroll', update)
    }
  }, [])

  return inset
}
