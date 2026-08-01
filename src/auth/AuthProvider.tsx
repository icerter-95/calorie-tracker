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
import {
  clearSavedAccounts,
  getSavedAccount,
  listSavedAccountSummaries,
  removeSavedAccount,
  upsertSavedAccountFromSession,
  type SavedAccountSummary,
} from '../lib/savedAccounts'

type AuthContextValue = {
  configured: boolean
  loading: boolean
  session: Session | null
  user: User | null
  savedAccounts: SavedAccountSummary[]
  signIn: (email: string, password: string) => Promise<void>
  signUp: (email: string, password: string, displayName: string) => Promise<void>
  updateDisplayName: (displayName: string) => Promise<void>
  /** Sign out current account only; other saved accounts remain for quick switch. */
  signOut: () => Promise<void>
  /** Sign out everywhere and clear the device account list. */
  signOutAll: () => Promise<void>
  /** Switch to another saved account without typing password. */
  switchAccount: (userId: string) => Promise<void>
  /** Keep current session saved, clear local session, show login to add another. */
  startAddAccount: () => Promise<void>
  removeSavedAccountFromDevice: (userId: string) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [session, setSession] = useState<Session | null>(null)
  const [savedAccounts, setSavedAccounts] = useState<SavedAccountSummary[]>(() =>
    listSavedAccountSummaries(),
  )

  const refreshSavedAccounts = useCallback(() => {
    setSavedAccounts(listSavedAccountSummaries())
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

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName.trim(),
        },
      },
    })
    if (error) throw error
  }, [])

  const updateDisplayName = useCallback(async (displayName: string) => {
    if (!supabase) throw new Error('Supabase is not configured.')
    const trimmed = displayName.trim()
    if (!trimmed) throw new Error('Name cannot be empty.')
    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: trimmed },
    })
    if (error) throw error
    if (data.user) {
      setSession((prev) => {
        if (!prev) return prev
        const next = { ...prev, user: data.user }
        upsertSavedAccountFromSession(next)
        return next
      })
      refreshSavedAccounts()
    }
  }, [refreshSavedAccounts])

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
        throw new Error(
          'Could not switch accounts. Sign in again for that user (saved session may have expired).',
        )
      }
      if (data.session) {
        upsertSavedAccountFromSession(data.session)
        refreshSavedAccounts()
      }
    },
    [session, refreshSavedAccounts],
  )

  const startAddAccount = useCallback(async () => {
    if (!supabase) throw new Error('Supabase is not configured.')
    if (session) {
      upsertSavedAccountFromSession(session)
      refreshSavedAccounts()
    }
    // Local sign-out keeps the refresh token valid for switching back.
    const { error } = await supabase.auth.signOut({ scope: 'local' })
    if (error) throw error
  }, [session, refreshSavedAccounts])

  const removeSavedAccountFromDevice = useCallback(
    (userId: string) => {
      if (session?.user.id === userId) return
      removeSavedAccount(userId)
      refreshSavedAccounts()
    },
    [session?.user.id, refreshSavedAccounts],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      configured: isSupabaseConfigured,
      loading,
      session,
      user: session?.user ?? null,
      savedAccounts,
      signIn,
      signUp,
      updateDisplayName,
      signOut,
      signOutAll,
      switchAccount,
      startAddAccount,
      removeSavedAccountFromDevice,
    }),
    [
      loading,
      session,
      savedAccounts,
      signIn,
      signUp,
      updateDisplayName,
      signOut,
      signOutAll,
      switchAccount,
      startAddAccount,
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
