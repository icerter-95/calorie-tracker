/**
 * Auth email links (confirm signup) must land back on this app origin + base path.
 * Keep this in the Supabase allow list (Authentication → URL Configuration).
 */
const CALLBACK_QUERY_KEYS = [
  'code',
  'error',
  'error_code',
  'error_description',
  'type',
  'token',
  'token_hash',
] as const

export type AuthCallbackNotice = {
  kind: 'confirmed' | 'error'
  message: string
}

export function getAuthRedirectUrl(): string {
  const base = import.meta.env.BASE_URL || '/'
  const path = base.endsWith('/') ? base : `${base}/`
  return `${window.location.origin}${path}`
}

export function readAuthCallbackNotice(): AuthCallbackNotice | null {
  const url = new URL(window.location.href)
  const hashParams = new URLSearchParams(url.hash.replace(/^#/, ''))
  const rawError =
    url.searchParams.get('error_description') ||
    url.searchParams.get('error') ||
    hashParams.get('error_description') ||
    hashParams.get('error')
  if (rawError) {
    return {
      kind: 'error',
      message: decodeURIComponent(rawError.replace(/\+/g, ' ')),
    }
  }

  const type = url.searchParams.get('type') || hashParams.get('type')
  if (type === 'signup' || type === 'email') {
    return {
      kind: 'confirmed',
      message: 'Email confirmed. You can sign in.',
    }
  }
  return null
}

/** Strip one-time auth params after Supabase has already consumed them. */
export function clearAuthCallbackParams(): void {
  const url = new URL(window.location.href)
  let changed = false
  for (const key of CALLBACK_QUERY_KEYS) {
    if (url.searchParams.has(key)) {
      url.searchParams.delete(key)
      changed = true
    }
  }
  if (url.hash && /access_token|refresh_token|error|type=/.test(url.hash)) {
    url.hash = ''
    changed = true
  }
  if (!changed) return
  const next = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState({}, document.title, next)
}
