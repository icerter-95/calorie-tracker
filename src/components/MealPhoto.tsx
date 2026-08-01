import { useEffect, useState } from 'react'
import { resolvePhotoUrl } from '../lib/mealPhotos'

interface MealPhotoProps {
  photoUrl?: string | null
  alt?: string
  className?: string
}

/** Resolves a storage path (or legacy URL) into a displayable image. */
export default function MealPhoto({
  photoUrl,
  alt = 'Meal photo',
  className = '',
}: MealPhotoProps) {
  const [src, setSrc] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    let cancelled = false
    setFailed(false)
    setSrc(null)

    if (!photoUrl) return

    resolvePhotoUrl(photoUrl)
      .then((url) => {
        if (!cancelled) setSrc(url)
      })
      .catch(() => {
        if (!cancelled) setFailed(true)
      })

    return () => {
      cancelled = true
    }
  }, [photoUrl])

  if (!photoUrl || failed || !src) return null

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      onError={() => setFailed(true)}
    />
  )
}
