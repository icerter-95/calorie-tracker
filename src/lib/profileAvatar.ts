const STORAGE_PREFIX = 'calorie-tracker.avatar.'

export function getStoredAvatarUrl(userId: string | null | undefined): string | null {
  if (!userId) return null
  try {
    const value = localStorage.getItem(`${STORAGE_PREFIX}${userId}`)
    return value && value.startsWith('data:image/') ? value : null
  } catch {
    return null
  }
}

export function setStoredAvatarUrl(userId: string, dataUrl: string) {
  localStorage.setItem(`${STORAGE_PREFIX}${userId}`, dataUrl)
}

export function clearStoredAvatarUrl(userId: string) {
  localStorage.removeItem(`${STORAGE_PREFIX}${userId}`)
}
