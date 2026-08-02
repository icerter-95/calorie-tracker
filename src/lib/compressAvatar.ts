const AVATAR_EDGE = 192
const JPEG_QUALITY = 0.72

/**
 * Center-crop to a square and compress for profile avatars.
 * Keeps the result small enough for user_metadata (~3–8 KB).
 */
export async function compressAvatar(file: File | Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const side = Math.min(bitmap.width, bitmap.height)
    const sx = Math.max(0, Math.round((bitmap.width - side) / 2))
    const sy = Math.max(0, Math.round((bitmap.height - side) / 2))

    const canvas = document.createElement('canvas')
    canvas.width = AVATAR_EDGE
    canvas.height = AVATAR_EDGE
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not process image')

    ctx.drawImage(bitmap, sx, sy, side, side, 0, 0, AVATAR_EDGE, AVATAR_EDGE)

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) resolve(result)
          else reject(new Error('Could not compress avatar'))
        },
        'image/jpeg',
        JPEG_QUALITY,
      )
    })

    return blob
  } finally {
    bitmap.close()
  }
}
