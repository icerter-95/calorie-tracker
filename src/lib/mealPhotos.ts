import { supabase } from './supabase'

const BUCKET = 'meal-photos'
const SIGNED_URL_TTL_SEC = 60 * 60 // 1 hour

function requireClient() {
  if (!supabase) {
    throw new Error('Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
  }
  return supabase
}

function isStoragePath(value: string): boolean {
  // Stored as "{userId}/{filename}.jpg" — not a full http(s) URL
  return Boolean(value) && !/^https?:\/\//i.test(value)
}

/** Works on iPhone over http://LAN too (crypto.randomUUID needs a secure context). */
function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const bytes = new Uint8Array(16)
    crypto.getRandomValues(bytes)
    bytes[6] = (bytes[6] & 0x0f) | 0x40
    bytes[8] = (bytes[8] & 0x3f) | 0x80
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
    return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
  }
  return `photo-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

/** Turn a stored path (or legacy full URL) into a browser-displayable URL. */
export async function resolvePhotoUrl(photoUrl: string | undefined | null): Promise<string | null> {
  if (!photoUrl) return null
  if (!isStoragePath(photoUrl)) return photoUrl

  const client = requireClient()
  const { data, error } = await client.storage
    .from(BUCKET)
    .createSignedUrl(photoUrl, SIGNED_URL_TTL_SEC)

  if (error) throw error
  return data.signedUrl
}

export async function uploadMealPhoto(blob: Blob): Promise<string> {
  const client = requireClient()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('You must be signed in.')

  const path = `${userData.user.id}/${createId()}.jpg`
  const { error } = await client.storage.from(BUCKET).upload(path, blob, {
    contentType: 'image/jpeg',
    upsert: false,
  })
  if (error) throw error
  return path
}

export async function deleteMealPhoto(photoUrl: string | undefined | null): Promise<void> {
  if (!photoUrl || !isStoragePath(photoUrl)) return

  const client = requireClient()
  const { error } = await client.storage.from(BUCKET).remove([photoUrl])
  if (error) throw error
}

/** Best-effort cleanup of every object under the signed-in user's folder. */
export async function deleteAllUserMealPhotos(): Promise<void> {
  const client = requireClient()
  const { data: userData, error: userError } = await client.auth.getUser()
  if (userError) throw userError
  if (!userData.user) throw new Error('You must be signed in.')

  const folder = userData.user.id
  const { data: files, error: listError } = await client.storage.from(BUCKET).list(folder)
  if (listError) throw listError
  if (!files?.length) return

  const paths = files.map((file) => `${folder}/${file.name}`)
  const { error } = await client.storage.from(BUCKET).remove(paths)
  if (error) throw error
}
