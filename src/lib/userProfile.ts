import type { User } from '@supabase/supabase-js'

export function getDisplayName(user: User | null | undefined): string {
  const meta = user?.user_metadata?.display_name
  if (typeof meta === 'string' && meta.trim()) return meta.trim()

  const email = user?.email
  if (email) return email.split('@')[0] || 'there'

  return 'there'
}

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
  }
  return (name.trim().slice(0, 2) || '?').toUpperCase()
}
