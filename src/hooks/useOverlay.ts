/**
 * Overlay helpers: lock background scroll and pin sheets to the visual
 * viewport so the iPhone PWA keyboard does not shove the curtain off-screen.
 */
import { useEffect, useState } from 'react'

export type VisualViewportBox = {
  top: number
  left: number
  width: number
  height: number
}

function readViewportBox(): VisualViewportBox {
  const vv = typeof window !== 'undefined' ? window.visualViewport : null
  if (vv) {
    return {
      top: vv.offsetTop,
      left: vv.offsetLeft,
      width: vv.width,
      height: vv.height,
    }
  }
  return {
    top: 0,
    left: 0,
    width: typeof window !== 'undefined' ? window.innerWidth : 0,
    height: typeof window !== 'undefined' ? window.innerHeight : 0,
  }
}

/** Visible browser chrome, excluding the software keyboard on iOS. */
export function useVisualViewportBox(): VisualViewportBox {
  const [box, setBox] = useState<VisualViewportBox>(readViewportBox)

  useEffect(() => {
    function update() {
      setBox(readViewportBox())
    }

    const vv = window.visualViewport
    vv?.addEventListener('resize', update)
    vv?.addEventListener('scroll', update)
    window.addEventListener('resize', update)
    update()
    return () => {
      vv?.removeEventListener('resize', update)
      vv?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
  }, [])

  return box
}

export function useLockBodyScroll() {
  useEffect(() => {
    const { body, documentElement } = document
    const scrollY = window.scrollY
    const prev = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
      htmlOverflow: documentElement.style.overflow,
    }

    // iOS ignores overflow:hidden on body once an input is focused. Pinning
    // the document stops the PWA from scrolling the sheet off-screen.
    body.style.overflow = 'hidden'
    body.style.position = 'fixed'
    body.style.top = `-${scrollY}px`
    body.style.left = '0'
    body.style.right = '0'
    body.style.width = '100%'
    documentElement.style.overflow = 'hidden'

    return () => {
      body.style.overflow = prev.overflow
      body.style.position = prev.position
      body.style.top = prev.top
      body.style.left = prev.left
      body.style.right = prev.right
      body.style.width = prev.width
      documentElement.style.overflow = prev.htmlOverflow
      window.scrollTo(0, scrollY)
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
