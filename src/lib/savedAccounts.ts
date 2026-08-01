import type { Session } from '@supabase/supabase-js'
import { getDisplayName } from './userProfile'

const STORAGE_KEY = 'calorie-tracker.saved-accounts'

export type SavedAccount = {
  userId: string
  email: string
  displayName: string
  accessToken: string
  refreshToken: string
  updatedAt: number
}

export type SavedAccountSummary = Pick<SavedAccount, 'userId' | 'email' | 'displayName' | 'updatedAt'>

function readAll(): SavedAccount[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SavedAccount[]
    if (!Array.isArray(parsed)) return []
    return parsed.filter(
      (a) =>
        a &&
        typeof a.userId === 'string' &&
        typeof a.accessToken === 'string' &&
        typeof a.refreshToken === 'string',
    )
  } catch {
    return []
  }
}

function writeAll(accounts: SavedAccount[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts))
}

export function listSavedAccounts(): SavedAccount[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt)
}

export function listSavedAccountSummaries(): SavedAccountSummary[] {
  return listSavedAccounts().map(({ userId, email, displayName, updatedAt }) => ({
    userId,
    email,
    displayName,
    updatedAt,
  }))
}

export function getSavedAccount(userId: string): SavedAccount | null {
  return readAll().find((a) => a.userId === userId) ?? null
}

export function upsertSavedAccountFromSession(session: Session): SavedAccount[] {
  const user = session.user
  const next: SavedAccount = {
    userId: user.id,
    email: user.email ?? '',
    displayName: getDisplayName(user),
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    updatedAt: Date.now(),
  }

  const others = readAll().filter((a) => a.userId !== user.id)
  const accounts = [next, ...others]
  writeAll(accounts)
  return accounts
}

export function removeSavedAccount(userId: string): SavedAccount[] {
  const accounts = readAll().filter((a) => a.userId !== userId)
  writeAll(accounts)
  return accounts
}

export function clearSavedAccounts() {
  localStorage.removeItem(STORAGE_KEY)
}
