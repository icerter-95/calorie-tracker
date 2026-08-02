import { supabase } from './supabase'

const USERNAME_RE = /^[a-z][a-z0-9_]{2,19}$/

export function normalizeUsername(value: string): string {
  return value.trim().toLowerCase()
}

export function validateUsername(value: string): string | null {
  const username = normalizeUsername(value)
  if (!username) return 'Enter a username.'
  if (!USERNAME_RE.test(username)) {
    return 'Use 3–20 chars: start with a letter, then letters, numbers, or _.'
  }
  return null
}

export async function fetchLoginUsername(userId: string): Promise<string | null> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { data, error } = await supabase
    .from('login_profiles')
    .select('username')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  return data?.username ?? null
}

export async function saveLoginUsername(userId: string, usernameRaw: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const username = normalizeUsername(usernameRaw)
  const invalid = validateUsername(username)
  if (invalid) throw new Error(invalid)

  const { error } = await supabase.from('login_profiles').upsert(
    {
      user_id: userId,
      username,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) {
    if (error.code === '23505') {
      throw new Error('That username is already taken.')
    }
    throw error
  }
  return username
}

export async function clearLoginUsername(userId: string): Promise<void> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const { error } = await supabase.from('login_profiles').delete().eq('user_id', userId)
  if (error) throw error
}

export async function resolveUsernameToEmail(usernameRaw: string): Promise<string> {
  if (!supabase) throw new Error('Supabase is not configured.')
  const username = normalizeUsername(usernameRaw)
  if (!username) throw new Error('Enter your username.')

  const { data, error } = await supabase.rpc('resolve_login_username', {
    p_username: username,
  })
  if (error) throw error
  if (typeof data !== 'string' || !data) {
    throw new Error('Invalid username or passcode.')
  }
  return data
}
