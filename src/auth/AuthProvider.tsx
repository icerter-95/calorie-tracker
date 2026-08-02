import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { isSupabaseConfigured, supabase } from '../lib/supabase'
import { blobToBase64 } from '../lib/compressImage'
import { compressAvatar } from '../lib/compressAvatar'
import {
  clearStoredAvatarUrl,
  setStoredAvatarUrl,
} from '../lib/profileAvatar'
import {
  clearLoginUsername,
  fetchLoginUsername,
  normalizeUsername,
  resolveUsernameToEmail,
  saveLoginUsername,
  validateUsername,
} from '../lib/loginProfile'
import {
  clearSavedAccounts,
  getSavedAccount,
  listSavedAccountSummaries,
  removeSavedAccount,
  upsertSavedAccountFromSession,
  type SavedAccountSummary,
} from '../lib/savedAccounts'

const RETURN_ACCOUNT_KEY = 'calorie-tracker.return-account-id'

function readReturnAccountId(): string | null {
  try {
    return localStorage.getItem(RETURN_ACCOUNT_KEY)
  } catch {
    return null
  }
}

function writeReturnAccountId(userId: string | null) {
  try {
    if (userId) localStorage.setItem(RETURN_ACCOUNT_KEY, userId)
    else localStorage.removeItem(RETURN_ACCOUNT_KEY)
  } catch {
    // ignore storage failures
  }
}

type AuthContextValue = {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  savedAccounts: SavedAccountSummary[]
  /** Account to restore when cancelling "add another account". */
  returnAccount: SavedAccountSummary | null
  signIn: (email: string, password: string) => Promise<void>
  /** Sign in with quick-login username + account password (passcode). */
  signInWithUsername: (username: string, passcode: string) => Promise<void>
  /** Creates account; username is both display name and quick-login id. */
  signUp: (email: string, password: string, username: string) => Promise<void>
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>
  getLoginUsername: () => Promise<string | null>
  /** Sets username for login and as the display name (same value). */
  setLoginUsername: (username: string) => Promise<string>
  removeLoginUsername: () => Promise<void>
  updateAvatar: (file: File) => Promise<void>
  removeAvatar: () => Promise<void>
  /** Sign out current account only; other saved accounts remain for quick switch. */
  signOut: () => Promise<void>
  /** Sign out everywhere and clear the device account list. */
  signOutAll: () => Promise<void>
  /** Switch to another saved account without typing password. */
  switchAccount: (userId: string) => Promise<void>
  /** Keep current session saved, clear local session, show login to add another. */
  startAddAccount: () => Promise<void>
  /** Cancel add-account flow and restore the previous session. */
  cancelAddAccount: () => Promise<void>
  removeSavedAccountFromDevice: (userId: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccountSummary[]>(() =>
    listSavedAccountSummaries(),
  )
  const [returnAccountId, setReturnAccountId] = useState<string | null>(() =>
    readReturnAccountId(),
  )

  const refreshSavedAccounts = useCallback(() => {
    setSavedAccounts(listSavedAccountSummaries())
  }, [])

  const clearReturnAccount = useCallback(() => {
    writeReturnAccountId(null)
    setReturnAccountId(null)
  }, [])

  useEffect(() => {
    if (!supabase) {
      setLoading(false)
      return
    }

    let mounted = true

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      if (data.session) {
        upsertSavedAccountFromSession(data.session)
        refreshSavedAccounts()
      }
      setSession(data.session)
      setLoading(false)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      setSession(nextSession)
      setLoading(false)

      // Persist tokens so we can switch back later (including after refresh).
      if (
        nextSession &&
        (event === 'SIGNED_IN' ||
          event === 'TOKEN_REFRESHED' ||
          event === 'USER_UPDATED' ||
          event === 'INITIAL_SESSION')
      ) {
        upsertSavedAccountFromSession(nextSession)
        refreshSavedAccounts()
        // Any established session means we left the add-account login screen.
        if (event === 'SIGNED_IN') {
          writeReturnAccountId(null)
          setReturnAccountId(null)
        }
      }
    })

    return () => {
      mounted = false
      subscription.unsubscribe()
    }
  }, [refreshSavedAccounts])

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
  }, [])

  const signInWithUsername = useCallback(async (username: string, passcode: string) => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const email = await resolveUsernameToEmail(username)
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: passcode,
    })
    if (error) throw new Error('Invalid username or passcode.')
  }, [])

  const applyUpdatedUser = useCallback(
    (nextUser: User) => {
      setSession((prev) => {
        if (!prev) return prev
        const next = { ...prev, user: nextUser }
        upsertSavedAccountFromSession(next)
        return next
      })
      refreshSavedAccounts()
    },
    [refreshSavedAccounts],
  )

  const syncDisplayName = useCallback(
    async (displayName: string) => {
      if (!supabase) throw new Error('Supabase is not configured.')
      const { data, error } = await supabase.auth.updateUser({
        data: { display_name: displayName },
      })
      if (error) throw error
      if (data.user) applyUpdatedUser(data.user)
    },
    [applyUpdatedUser],
  )

  const signUp = useCallback(
    async (email: string, password: string, usernameRaw: string) => {
      if (!supabase) throw new Error('Supabase is not configured.')
      const username = normalizeUsername(usernameRaw)
      const invalid = validateUsername(username)
      if (invalid) throw new Error(invalid)

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: username,
          },
        },
      })
      if (error) throw error

      // If email confirmation is off, session is available immediately — claim the username.
      if (data.user && data.session) {
        await saveLoginUsername(data.user.id, username)
      }
    },
    [],
  )

  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      if (!supabase) throw new Error('Supabase is not configured.')
      const email = session?.user.email
      if (!email) throw new Error('You must be signed in.')
      if (newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters.')
      }

      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email,
        password: currentPassword,
      })
      if (verifyError) throw new Error('Current password is incorrect.')

      const { data, error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) throw error
      if (data.user) applyUpdatedUser(data.user)
    },
    [session?.user.email, applyUpdatedUser],
  )

  const getLoginUsername = useCallback(async () => {
    const userId = session?.user.id
    if (!userId) throw new Error('You must be signed in.')
    return fetchLoginUsername(userId)
  }, [session?.user.id])

  const setLoginUsername = useCallback(
    async (username: string) => {
      const userId = session?.user.id
      if (!userId) throw new Error('You must be signed in.')
      const saved = await saveLoginUsername(userId, username)
      // Username and display name are the same value everywhere in the app.
      await syncDisplayName(saved)
      return saved
    },
    [session?.user.id, syncDisplayName],
  )

  const removeLoginUsername = useCallback(async () => {
    const userId = session?.user.id
    if (!userId) throw new Error('You must be signed in.')
    await clearLoginUsername(userId)
    const fallback =
      session?.user.email?.split('@')[0]?.trim() || 'there'
    await syncDisplayName(fallback)
  }, [session?.user.id, session?.user.email, syncDisplayName])

  const touchSessionForAvatar = useCallback(() => {
    setSession((prev) => {
      if (!prev) return prev
      // Clone so avatar consumers re-render after localStorage changes.
      const next = { ...prev, user: { ...prev.user } }
      upsertSavedAccountFromSession(next)
      return next
    })
    refreshSavedAccounts()
  }, [refreshSavedAccounts])

  const updateAvatar = useCallback(async (file: File) => {
    const userId = session?.user.id
    if (!userId) throw new Error('You must be signed in.')
    if (!file.type.startsWith('image/')) throw new Error('Please choose an image.')

    const compressed = await compressAvatar(file)
    const base64 = await blobToBase64(compressed)
    const dataUrl = `data:image/jpeg;base64,${base64}`
    setStoredAvatarUrl(userId, dataUrl)
    touchSessionForAvatar()
  }, [session?.user.id, touchSessionForAvatar])

  const removeAvatar = useCallback(async () => {
    const userId = session?.user.id
    if (!userId) throw new Error('You must be signed in.')

    clearStoredAvatarUrl(userId)
    touchSessionForAvatar()
  }, [session?.user.id, touchSessionForAvatar])

  const signOut = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const currentId = session?.user.id
    // Local only: keep refresh token valid so this account stays switchable if we re-add it.
    // We intentionally remove it from the device list below.
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
    if (currentId) {
      removeSavedAccount(currentId)
      refreshSavedAccounts()
    }
  }, [session?.user.id, refreshSavedAccounts])

  const signOutAll = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
    clearSavedAccounts()
    refreshSavedAccounts()
  }, [refreshSavedAccounts])

  const switchAccount = useCallback(
    async (userId: string) => {
      if (!supabase) throw new Error('Supabase is not configured.')
      if (session?.user.id === userId) return

      // Persist latest tokens for the account we're leaving.
      if (session) {
        upsertSavedAccountFromSession(session)
      }

      const target = getSavedAccount(userId)
      if (!target) throw new Error('That account is not saved on this device.')

      const { data, error } = await supabase.auth.setSession({
        access_token: target.accessToken,
        refresh_token: target.refreshToken,
      })
      if (error) {
        removeSavedAccount(userId)
        refreshSavedAccounts()
        clearReturnAccount()
        throw new Error(
          'Could not switch accounts. Sign in again for that user (saved session may have expired).',
        )
      }
      if (data.session) {
        upsertSavedAccountFromSession(data.session)
        refreshSavedAccounts()
        clearReturnAccount()
      }
    },
    [session, refreshSavedAccounts, clearReturnAccount],
  )

  const startAddAccount = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured.')
    if (!session?.user.id) throw new Error('You must be signed in.')

    const leavingId = session.user.id
    // Persist tokens BEFORE local sign-out so Cancel / Continue as can restore this account.
    upsertSavedAccountFromSession(session)
    writeReturnAccountId(leavingId)
    setReturnAccountId(leavingId)
    refreshSavedAccounts()

    // Local sign-out keeps the refresh token valid for switching back.
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) {
      clearReturnAccount()
      throw error
    }
    refreshSavedAccounts()
  }, [session, refreshSavedAccounts, clearReturnAccount])

  const cancelAddAccount = useCallback(async () => {
    const targetId =
      returnAccountId ??
      readReturnAccountId() ??
      listSavedAccountSummaries()[0]?.userId
    if (!targetId) throw new Error('Nothing to go back to.')
    await switchAccount(targetId)
  }, [returnAccountId, switchAccount])

  const removeSavedAccountFromDevice = useCallback(
    (userId: string) => {
      if (session?.user.id === userId) return
      removeSavedAccount(userId)
      refreshSavedAccounts()
      if (returnAccountId === userId) clearReturnAccount()
    },
    [session?.user.id, refreshSavedAccounts, returnAccountId, clearReturnAccount],
  )

  // Prefer the account we left during "add another"; otherwise the most recent saved one.
  const returnAccount = useMemo(() => {
    if (session || savedAccounts.length === 0) return null
    if (returnAccountId) {
      return savedAccounts.find((a) => a.userId === returnAccountId) ?? savedAccounts[0]
    }
    return null
  }, [returnAccountId, savedAccounts, session])

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      savedAccounts,
      returnAccount,
      signIn,
      signInWithUsername,
      signUp,
      updatePassword,
      getLoginUsername,
      setLoginUsername,
      removeLoginUsername,
      updateAvatar,
      removeAvatar,
      signOut,
      signOutAll,
      switchAccount,
      startAddAccount,
      cancelAddAccount,
      removeSavedAccountFromDevice,
    }),
    [
      loading,
      session,
      savedAccounts,
      returnAccount,
      signIn,
      signInWithUsername,
      signUp,
      updatePassword,
      getLoginUsername,
      setLoginUsername,
      removeLoginUsername,
      updateAvatar,
      removeAvatar,
      signOut,
      signOutAll,
      switchAccount,
      startAddAccount,
      cancelAddAccount,
      removeSavedAccountFromDevice,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
