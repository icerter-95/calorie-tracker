import { useEffect, useState } from 'react'

/**
 * Recharts writes colours into SVG presentation attributes, which do not
 * support `var()`. So we read the tokens off the document and re-read them when
 * the theme flips, rather than hardcoding hex that only suits one theme.
 */
const TOKENS = {
  grid: '--line',
  axis: '--content-subtle',
  accent: '--accent',
  accentActive: '--accent-hover',
  health: '--health',
  faint: '--content-faint',
} as const

export type ChartColors = Record<keyof typeof TOKENS, string>

function read(): ChartColors {
  const styles = getComputedStyle(document.documentElement)
  const resolved = {} as ChartColors
  for (const [name, token] of Object.entries(TOKENS)) {
    const channels = styles.getPropertyValue(token).trim()
    resolved[name as keyof ChartColors] = channels ? `rgb(${channels})` : 'currentColor'
  }
  return resolved
}

export function useChartColors(): ChartColors {
  const [colors, setColors] = useState<ChartColors>(read)

  useEffect(() => {
    const observer = new MutationObserver(() => setColors(read()))
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    })
    return () => observer.disconnect()
  }, [])

  return colors
}
